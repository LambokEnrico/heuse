# PayPal Setup Guide for HEUSE

> HEUSE uses **PayPal REST API** for payment processing.
> Sandbox mode is **free** — no real money, perfect for demo/testing.

---

## 1. Create PayPal Developer Account

1. Go to https://developer.paypal.com
2. Click "Sign Up" or log in with existing PayPal account
3. Verify email if needed

## 2. Create a Sandbox App

1. In dashboard, toggle to **"Sandbox"** view (top-left)
2. Go to **Apps & Credentials**
3. Click **"Create App"**
4. App name: `HEUSE Sandbox` (or anything)
5. App type: **Merchant**
6. Click **Create App**

You'll get:
- **Client ID** (public, starts with `AYSq…` for sandbox)
- **Secret** (private, click "Show" to reveal)

## 3. Add to `.env`

```env
PAYPAL_CLIENT_ID="AYSq…xxxx"
PAYPAL_CLIENT_SECRET="ELH0…xxxx"
NEXT_PUBLIC_PAYPAL_CLIENT_ID="AYSq…xxxx"
PAYPAL_ENVIRONMENT="sandbox"
PAYPAL_DEFAULT_CURRENCY="IDR"
```

> ⚠️ **Sandbox vs Live** — credentials are environment-specific. Don't mix.

## 4. Create Sandbox Test Accounts

PayPal auto-creates test accounts, but you can make more:

1. Go to **Sandbox > Accounts**
2. You'll see:
   - **Business** account (merchant) — already created
   - **Personal** account (buyer) — already created
3. Click on the personal account → "Set password" / "View/Edit"
4. Note the email (looks like `sb-buyer@personal.example.com`)
5. Use this email to log in during testing

## 5. Test a Payment

### Local Setup

```bash
# 1. Start local PostgreSQL (Docker)
docker compose up -d

# 2. Install + migrate
npm install
npx prisma migrate dev --name init
npm run db:seed

# 3. Start dev server
npm run dev
```

### Test Flow

1. Go to `http://localhost:3000/checkout`
2. Fill in form, click "Pay with PayPal"
3. PayPal popup opens
4. Log in with the **personal sandbox account** (from step 4)
5. Approve payment
6. You'll be redirected back to HEUSE success page
7. Check admin → Orders → status should be `CONFIRMED` / `PAID`

### Sandbox Money

Sandbox accounts have **fake money** (usually $1,000 USD). You can top up at any time in the dashboard.

## 6. Webhooks (For Local Dev)

PayPal needs to reach your local server to send events. Use **ngrok**:

```bash
# Install: npm install -g ngrok
# Or download: https://ngrok.com/download

ngrok http 3000
```

You'll get a public URL like `https://a1b2c3.ngrok-free.app`.

Then in PayPal Dashboard:
1. Apps & Credentials > [Your App] > **Webhooks** tab
2. Click **Add Webhook**
3. URL: `https://a1b2c3.ngrok-free.app/api/paypal/webhook`
4. Events to subscribe:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `CHECKOUT.ORDER.APPROVED`
5. Save → copy the **Webhook ID** to your `.env`:
   ```env
   PAYPAL_WEBHOOK_ID="4AK4393…"
   ```

## 7. Going Live (Production)

When ready for real money:

1. Toggle to **"Live"** view in PayPal dashboard
2. Create a **Live** app
3. Complete **business verification** (requires real business info)
4. Replace sandbox credentials with live ones in `.env`:
   ```env
   PAYPAL_CLIENT_ID="<live-client-id>"
   PAYPAL_CLIENT_SECRET="<live-secret>"
   NEXT_PUBLIC_PAYPAL_CLIENT_ID="<live-client-id>"
   PAYPAL_ENVIRONMENT="live"
   ```
5. Update webhook URL to your production domain
6. Test with a small real transaction first

## 8. Currencies

HEUSE uses **IDR** (Indonesian Rupiah) by default. Key rules:

- **IDR, JPY, TWD, KRW, VND** — NO decimals (use integer strings: `"100000"`)
- **USD, EUR, GBP, AUD** — 2 decimals (`"99.99"`)

The PayPal client in `lib/paypal.ts` handles this automatically (see `ZERO_DECIMAL_CURRENCIES`).

To change currency:
```env
PAYPAL_DEFAULT_CURRENCY="USD"  # or any ISO 4217 code
```

## 9. Security Notes

- ✅ **Always verify webhook signatures** — we do this in `app/api/paypal/webhook/route.ts`
- ✅ **Always verify amount + currency server-side** — we do this in `capture-order/route.ts`
- ✅ **Never trust client** — the frontend can't lie about payment status
- ✅ **Use sandbox for testing** — no real charges
- ✅ **Idempotency** — we check `paypalOrderId` uniqueness in DB

## 10. Troubleshooting

### "PAYPAL_CLIENT_ID is not set"

Set the env var in `.env` and restart the dev server.

### "Currency mismatch" on capture

Your `PAYPAL_DEFAULT_CURRENCY` doesn't match what was sent at order creation. Make sure they're consistent.

### Webhook signature verification fails

1. Check `PAYPAL_WEBHOOK_ID` is correct
2. Make sure you're using the right environment (sandbox webhook ID != live webhook ID)
3. For local dev, make sure ngrok is running and URL is updated in dashboard

### Sandbox payments don't show up

Wait 5-10 minutes. Sandbox can be slow. Check PayPal Sandbox > Notifications for status.

---

## Reference

- [PayPal REST API Docs](https://developer.paypal.com/api/rest/)
- [Orders v2](https://developer.paypal.com/api/rest/reference/orders/v2/)
- [Webhook Verification](https://developer.paypal.com/api/rest/webhooks/event-verification/)
- [Currency Codes](https://developer.paypal.com/reference/currency-codes/)

_Last updated: 2026-06-13 (Initial setup, IDR default currency)_
