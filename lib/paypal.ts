/**
 * PayPal REST API client (no SDK — uses fetch).
 *
 * Why no SDK? Direct fetch gives us full control + smaller bundle.
 * Follows best practices from `paypal-1.0.0` skill:
 *   - Sandbox vs production URL handling
 *   - OAuth token management (8hr expiry, refresh on demand)
 *   - CAPTURE intent (immediate charge on approval)
 *   - Currency decimal rules (USD=2, JPY=0)
 *
 * Docs: https://developer.paypal.com/api/rest/
 *
 * Get credentials: https://developer.paypal.com/dashboard/applications
 *   - Sandbox: free, fake money, no real charges
 *   - Live: requires business verification
 */

const PAYPAL_API_BASE = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
} as const;

type Environment = keyof typeof PAYPAL_API_BASE;

function isLive(): boolean {
  return process.env.PAYPAL_ENVIRONMENT === "live";
}

function getApiBase(): string {
  return isLive() ? PAYPAL_API_BASE.live : PAYPAL_API_BASE.sandbox;
}

function getClientId(): string {
  const id = process.env.PAYPAL_CLIENT_ID;
  if (!id) {
    throw new Error(
      "PAYPAL_CLIENT_ID is not set. See PAYPAL-SETUP.md for instructions."
    );
  }
  return id;
}

function getClientSecret(): string {
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!secret) {
    throw new Error(
      "PAYPAL_CLIENT_SECRET is not set. See PAYPAL-SETUP.md for instructions."
    );
  }
  return secret;
}

function getAuthHeader(): string {
  return (
    "Basic " +
    Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64")
  );
}

// =============================================================================
// OAuth Token Management
// =============================================================================

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

/**
 * Get a valid OAuth access token.
 * Tokens expire in ~8 hours (21600s). We cache and refresh before expiry.
 */
export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s safety margin)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const res = await fetch(`${getApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal OAuth error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

// =============================================================================
// Order Creation
// =============================================================================

export interface CreateOrderParams {
  /** Our internal order number. Maps to PayPal's `purchase_units[0].custom_id`. */
  orderNumber: string;
  /** Total amount. Use a string with proper decimal places ("10.50" for USD). */
  amount: string;
  /** ISO 4217 currency code (e.g. "USD", "IDR", "EUR", "JPY"). */
  currency: string;
  customer: {
    email: string;
    name?: string;
  };
  items: Array<{
    id: string;
    name: string;
    description?: string;
    unitAmount: string;
    quantity: number;
  }>;
  /** URLs for return/cancel. */
  urls?: {
    returnUrl: string;
    cancelUrl: string;
  };
}

export interface PayPalOrder {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  links: Array<{ href: string; rel: string; method?: string }>;
}

/**
 * Currencies with NO decimal places (must be integers as strings).
 * Source: https://developer.paypal.com/reference/currency-codes/
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "JPY", "TWD", "KRW", "VND", "IDR", "HUF", "CLP", "PYG", "UGX", "XAF", "XOF", "XPF",
]);

/**
 * Demo: hardcoded IDR → USD rate for sandbox testing.
 * PayPal sandbox accounts typically don't support IDR even though it's
 * listed as "supported" in docs — depends on merchant account configuration.
 * TODO: replace with a live FX API for production, OR force merchant account
 * to enable IDR, OR run in "live" mode with an IDR-enabled account.
 */
export const DEMO_IDR_TO_USD_RATE = 16000;

/**
 * Convert amount/currency for the PayPal API call.
 *
 * Sandbox: IDR → USD (sandbox accounts usually don't support IDR).
 * Live: pass-through (respect merchant account currency support).
 *
 * Used by BOTH createPayPalOrder (to send to PayPal) AND capture-order
 * validation (to verify PayPal returns what we expect).
 */
export function convertForPayPal(
  amount: number | string,
  currency: string
): { amount: string; currency: string; wasConverted: boolean } {
  const numAmount = Number(amount);
  if (!isLive() && currency.toUpperCase() === "IDR") {
    return {
      amount: (numAmount / DEMO_IDR_TO_USD_RATE).toFixed(2),
      currency: "USD",
      wasConverted: true,
    };
  }
  // Zero-decimal currencies (JPY, IDR, etc.) need integer strings
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
  return {
    amount: isZeroDecimal ? Math.round(numAmount).toString() : numAmount.toFixed(2),
    currency,
    wasConverted: false,
  };
}

/**
 * Create a PayPal order with CAPTURE intent.
 * Returns the PayPal order ID and approval URL for the frontend.
 */
export async function createPayPalOrder(
  params: CreateOrderParams
): Promise<PayPalOrder> {
  const token = await getAccessToken();

  // Sandbox: auto-convert IDR → USD (sandbox accounts rarely support IDR).
  // Live: respect the configured currency.
  const isLiveMode = isLive();
  const totalConverted = convertForPayPal(params.amount, params.currency);
  const paypalCurrency = totalConverted.currency;
  const paypalAmount = totalConverted.amount;
  const paypalItems = totalConverted.wasConverted
    ? params.items.map((it) => ({
        ...it,
        unitAmount: (Number(it.unitAmount) / DEMO_IDR_TO_USD_RATE).toFixed(2),
      }))
    : params.items;

  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(paypalCurrency.toUpperCase());
  if (isZeroDecimal && paypalAmount.includes(".")) {
    throw new Error(
      `Currency ${paypalCurrency} does not support decimals. Use integer string.`
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        custom_id: params.orderNumber,
        description: `Order ${params.orderNumber}`,
        amount: {
          currency_code: paypalCurrency,
          value: paypalAmount,
          breakdown: {
            item_total: {
              currency_code: paypalCurrency,
              value: paypalItems
                .reduce(
                  (sum, it) =>
                    sum + Number(it.unitAmount) * it.quantity,
                  0
                )
                .toFixed(isZeroDecimal ? 0 : 2),
            },
          },
        },
        items: paypalItems.map((it) => ({
          name: it.name.slice(0, 127), // PayPal limit
          description: it.description?.slice(0, 127),
          unit_amount: {
            currency_code: paypalCurrency,
            value: it.unitAmount,
          },
          quantity: it.quantity.toString(),
          sku: it.id,
          category: "PHYSICAL_GOODS",
        })),
      },
    ],
    payer: {
      email_address: params.customer.email,
      name: params.customer.name
        ? { given_name: params.customer.name }
        : undefined,
    },
    application_context: {
      brand_name: "HEUSE",
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
      return_url: params.urls?.returnUrl || `${siteUrl}/checkout/success/${params.orderNumber}`,
      cancel_url: params.urls?.cancelUrl || `${siteUrl}/checkout/cancel/${params.orderNumber}`,
    },
  };

  const res = await fetch(`${getApiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal create order error (${res.status}): ${text}`);
  }

  return (await res.json()) as PayPalOrder;
}

// =============================================================================
// Order Capture
// =============================================================================

export interface PayPalCapture {
  id: string;
  status: "COMPLETED" | "DECLINED" | "PARTIALLY_REFUNDED" | "PENDING" | "REFUNDED" | "FAILED";
  purchase_units: Array<{
    custom_id?: string;
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: { currency_code: string; value: string };
        final_capture?: boolean;
      }>;
    };
  }>;
  payer: {
    payer_id: string;
    email_address: string;
    name?: { given_name?: string; surname?: string };
  };
}

/**
 * Capture payment for an approved order. Idempotent.
 */
export async function capturePayPalOrder(
  paypalOrderId: string
): Promise<PayPalCapture> {
  const token = await getAccessToken();

  const res = await fetch(
    `${getApiBase()}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal capture error (${res.status}): ${text}`);
  }

  return (await res.json()) as PayPalCapture;
}

/**
 * Get order details (for verification before fulfillment).
 */
export async function getPayPalOrder(
  paypalOrderId: string
): Promise<PayPalOrder & { purchase_units: Array<{ amount: { value: string; currency_code: string }; payee?: { merchant_id?: string }; custom_id?: string }>; status: string }> {
  const token = await getAccessToken();
  const res = await fetch(
    `${getApiBase()}/v2/checkout/orders/${paypalOrderId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal get order error (${res.status}): ${text}`);
  }

  return res.json();
}

// =============================================================================
// Webhook Signature Verification
// =============================================================================

export interface PayPalWebhookEvent {
  id: string;
  event_type:
    | "CHECKOUT.ORDER.APPROVED"
    | "CHECKOUT.ORDER.COMPLETED"
    | "PAYMENT.CAPTURE.COMPLETED"
    | "PAYMENT.CAPTURE.DENIED"
    | "PAYMENT.CAPTURE.PENDING"
    | "PAYMENT.CAPTURE.REFUNDED"
    | "PAYMENT.CAPTURE.REVERSED"
    | "PAYMENT.CAPTURE.FAILED";
  resource: {
    id: string;
    custom_id?: string;
    status?: string;
    amount?: { currency_code: string; value: string };
    payee?: { merchant_id?: string };
    payer?: { payer_id?: string; email_address?: string };
  };
  summary?: string;
  create_time: string;
  resource_type: string;
}

/**
 * Verify a PayPal webhook signature.
 * MUST be called before processing any webhook event.
 *
 * PayPal signs each webhook with a certificate. We post back to PayPal
 * to verify the signature is authentic.
 *
 * Docs: https://developer.paypal.com/api/rest/webhooks/event-verification/
 */
export async function verifyWebhookSignature(
  headers: {
    authAlgo: string;
    certUrl: string;
    transmissionId: string;
    transmissionSig: string;
    transmissionTime: string;
  },
  webhookEvent: unknown
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("[paypal-webhook] PAYPAL_WEBHOOK_ID is not set");
    return false;
  }

  const token = await getAccessToken();

  const res = await fetch(
    `${getApiBase()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers.authAlgo,
        cert_url: headers.certUrl,
        transmission_id: headers.transmissionId,
        transmission_sig: headers.transmissionSig,
        transmission_time: headers.transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
    }
  );

  if (!res.ok) {
    console.error(`[paypal-webhook] verify error: ${res.status}`);
    return false;
  }

  const data = (await res.json()) as { verification_status: string };
  return data.verification_status === "SUCCESS";
}

// =============================================================================
// Status Mapping
// =============================================================================

export type PayPalPaymentStatus =
  | "UNPAID"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "EXPIRED";

export type PayPalOrderStatus =
  | "AWAITING_PAYMENT"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

/**
 * Map PayPal order/capture status to our internal states.
 */
export function mapPayPalStatus(eventType: string, captureStatus?: string): {
  paymentStatus: PayPalPaymentStatus;
  orderStatus: PayPalOrderStatus;
} {
  // Capture events are the most reliable
  if (eventType === "PAYMENT.CAPTURE.COMPLETED" || captureStatus === "COMPLETED") {
    return { paymentStatus: "PAID", orderStatus: "CONFIRMED" };
  }
  if (eventType === "PAYMENT.CAPTURE.DENIED" || captureStatus === "DECLINED") {
    return { paymentStatus: "FAILED", orderStatus: "CANCELLED" };
  }
  if (eventType === "PAYMENT.CAPTURE.PENDING" || captureStatus === "PENDING") {
    return { paymentStatus: "UNPAID", orderStatus: "AWAITING_PAYMENT" };
  }
  if (eventType === "PAYMENT.CAPTURE.REFUNDED" || captureStatus === "REFUNDED") {
    return { paymentStatus: "REFUNDED", orderStatus: "CANCELLED" };
  }
  if (eventType === "PAYMENT.CAPTURE.REVERSED" || eventType === "PAYMENT.CAPTURE.FAILED") {
    return { paymentStatus: "FAILED", orderStatus: "CANCELLED" };
  }
  // Order approved but not yet captured
  if (eventType === "CHECKOUT.ORDER.APPROVED") {
    return { paymentStatus: "UNPAID", orderStatus: "AWAITING_PAYMENT" };
  }
  return { paymentStatus: "UNPAID", orderStatus: "AWAITING_PAYMENT" };
}

/**
 * Get the environment label (sandbox/live) for display purposes.
 */
export function getPayPalEnvironment(): Environment {
  return isLive() ? "live" : "sandbox";
}

/**
 * Get client ID for frontend PayPal SDK (safe to expose).
 */
export function getPayPalClientId(): string {
  return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || getClientId();
}

// =============================================================================
// Refund
// =============================================================================

export interface PayPalRefund {
  id: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  amount: { currency_code: string; value: string };
  custom_id?: string;
  invoice_id?: string;
  note_to_payer?: string;
  create_time: string;
  update_time: string;
  links: Array<{ href: string; rel: string; method?: string }>;
}

export interface RefundPayPalOrderParams {
  /** The PayPal capture ID (NOT the order ID). */
  captureId: string;
  /**
   * Refund amount in the order's original currency (e.g. IDR).
   * Omit for a full refund. Must be > 0 and <= captured amount.
   */
  amount?: string;
  /**
   * Currency code for `amount`. Defaults to PAYPAL_DEFAULT_CURRENCY
   * (or "IDR"). Conversion to capture currency happens automatically
   * (sandbox: IDR→USD; live: pass-through).
   */
  currency?: string;
  /** Free-text note visible to the customer on PayPal side. */
  noteToPayer?: string;
}

/**
 * Issue a refund for a captured PayPal payment.
 *
 * Full refund: omit `amount` (or set to captured amount).
 * Partial refund: set `amount` to the partial value.
 *
 * PayPal refund amount MUST be in the same currency as the capture.
 * Sandbox captures are typically in USD (after IDR→USD conversion at
 * order-creation time), so this function re-uses the same conversion
 * logic via `convertForPayPal`.
 *
 * Docs: https://developer.paypal.com/api/rest/payments/captures/#captures_refund
 */
export async function refundPayPalOrder(
  params: RefundPayPalOrderParams
): Promise<PayPalRefund> {
  const token = await getAccessToken();

  let body: Record<string, unknown> = {};
  if (params.amount) {
    const currency = params.currency || process.env.PAYPAL_DEFAULT_CURRENCY || "IDR";
    const converted = convertForPayPal(params.amount, currency);
    body.amount = {
      value: converted.amount,
      currency_code: converted.currency,
    };
  }
  if (params.noteToPayer) {
    body.note_to_payer = params.noteToPayer.slice(0, 127); // PayPal limit
  }

  const res = await fetch(
    `${getApiBase()}/v2/payments/captures/${params.captureId}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal refund error (${res.status}): ${text}`);
  }

  return (await res.json()) as PayPalRefund;
}
