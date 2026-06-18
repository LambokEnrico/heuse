/**
 * Email service using Resend (https://resend.com)
 *
 * Setup:
 *   1. Sign up at resend.com
 *   2. Add domain (or use onboarding@resend.dev for testing)
 *   3. Create API key
 *   4. Set env vars:
 *      - RESEND_API_KEY
 *      - EMAIL_FROM (e.g., "HEUSE <orders@heuse.com>")
 *
 * Functions:
 *   - sendOrderConfirmation: After successful payment
 *   - sendOrderShipped: When admin marks order as shipped
 *   - sendOrderCancelled: When order is cancelled
 */

import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("[email] RESEND_API_KEY not set — emails will fail silently");
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || "HEUSE <onboarding@resend.dev>";

type OrderItem = {
  name: string;
  size: string;
  quantity: number;
  price: number;
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

function buildOrderItemsHtml(items: OrderItem[]): string {
  return items
    .map(
      (it) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #eee;">
          <strong style="font-size:15px;">${escapeHtml(it.name)}</strong><br/>
          <span style="color:#888;font-size:13px;">Size ${escapeHtml(it.size)} × ${it.quantity}</span>
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;">
          ${formatCurrency(it.price * it.quantity)}
        </td>
      </tr>`
    )
    .join("");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #fafafa; color: #1a1a1a; }
  .container { max-width: 600px; margin: 0 auto; background: white; }
  .header { padding: 32px 40px 16px; border-bottom: 1px solid #eee; }
  .brand { font-size: 24px; letter-spacing: 4px; font-weight: 600; margin: 0; }
  .content { padding: 32px 40px; }
  .order-num { font-family: monospace; background: #f4f4f4; padding: 4px 10px; border-radius: 4px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  .btn { display: inline-block; background: #1a1a1a; color: white !important; padding: 14px 28px; text-decoration: none; margin-top: 16px; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; }
  .footer { padding: 24px 40px; border-top: 1px solid #eee; color: #888; font-size: 12px; text-align: center; }
`;

export async function sendOrderConfirmation(params: {
  email: string;
  customerName: string;
  orderNumber: string;
  total: number;
  items: OrderItem[];
  siteUrl: string;
}): Promise<{ id: string } | null> {
  if (!resend) {
    console.warn("[email] Resend not initialized, skipping sendOrderConfirmation");
    return null;
  }

  const { email, customerName, orderNumber, total, items, siteUrl } = params;

  const html = `
    <!DOCTYPE html>
    <html>
      <head><style>${baseStyles}</style></head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="brand">HEUSE</h1>
          </div>
          <div class="content">
            <p>Halo ${escapeHtml(customerName)},</p>
            <p>Terima kasih atas pesanan lo. Pembayaran udah kami terima dan pesanan sedang kami proses.</p>
            <p>Order number: <span class="order-num">${escapeHtml(orderNumber)}</span></p>
            <h3 style="margin-top:32px;">Detail Pesanan</h3>
            <table>
              ${buildOrderItemsHtml(items)}
              <tr>
                <td style="padding:20px 0 4px;font-weight:bold;font-size:15px;">Total</td>
                <td style="padding:20px 0 4px;text-align:right;font-weight:bold;font-size:18px;">
                  ${formatCurrency(total)}
                </td>
              </tr>
            </table>
            <p>Kami akan kirim email lagi kalo pesanan udah dikirim.</p>
            <a href="${siteUrl}/checkout/success/${encodeURIComponent(orderNumber)}" class="btn">
              Lihat Detail Pesanan
            </a>
          </div>
          <div class="footer">
            HEUSE Luxury Menswear · Ada pertanyaan? Hubungi cs@heuse.com
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Order ${orderNumber} confirmed`,
      html,
    });
    if (result.error) {
      console.error(`[email] Resend error for ${orderNumber}:`, result.error);
      return null;
    }
    console.log(`[email] Order confirmation sent to ${email} for ${orderNumber} (${result.data?.id})`);
    return result.data ?? null;
  } catch (err) {
    console.error(`[email] Failed to send order confirmation for ${orderNumber}:`, err);
    return null;
  }
}

export async function sendOrderShipped(params: {
  email: string;
  customerName: string;
  orderNumber: string;
  trackingNumber?: string;
  siteUrl: string;
}): Promise<{ id: string } | null> {
  if (!resend) {
    console.warn("[email] Resend not initialized, skipping sendOrderShipped");
    return null;
  }

  const { email, customerName, orderNumber, trackingNumber, siteUrl } = params;

  const html = `
    <!DOCTYPE html>
    <html>
      <head><style>${baseStyles}</style></head>
      <body>
        <div class="container">
          <div class="header"><h1 class="brand">HEUSE</h1></div>
          <div class="content">
            <p>Halo ${escapeHtml(customerName)},</p>
            <p>Pesanan lo udah dikirim! 📦</p>
            <p>Order: <span class="order-num">${escapeHtml(orderNumber)}</span></p>
            ${trackingNumber ? `<p>Nomor resi: <strong>${escapeHtml(trackingNumber)}</strong></p>` : ""}
            <a href="${siteUrl}/account" class="btn">Track Order</a>
          </div>
          <div class="footer">HEUSE Luxury Menswear</div>
        </div>
      </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Order ${orderNumber} shipped`,
      html,
    });
    if (result.error) {
      console.error(`[email] Resend error:`, result.error);
      return null;
    }
    console.log(`[email] Shipping notification sent for ${orderNumber}`);
    return result.data ?? null;
  } catch (err) {
    console.error(`[email] Failed to send shipping notification:`, err);
    return null;
  }
}

export async function sendOrderCancelled(params: {
  email: string;
  customerName: string;
  orderNumber: string;
  reason?: string;
  refunded: boolean;
}): Promise<{ id: string } | null> {
  if (!resend) {
    console.warn("[email] Resend not initialized, skipping sendOrderCancelled");
    return null;
  }

  const { email, customerName, orderNumber, reason, refunded } = params;

  const html = `
    <!DOCTYPE html>
    <html>
      <head><style>${baseStyles}</style></head>
      <body>
        <div class="container">
          <div class="header"><h1 class="brand">HEUSE</h1></div>
          <div class="content">
            <p>Halo ${escapeHtml(customerName)},</p>
            <p>Order <span class="order-num">${escapeHtml(orderNumber)}</span> telah dibatalkan.</p>
            ${reason ? `<p><em>Alasan: ${escapeHtml(reason)}</em></p>` : ""}
            ${refunded ? "<p>✅ Dana sudah dikembalikan ke metode pembayaran lo.</p>" : "<p>Jika lo sudah membayar, dana akan dikembalikan dalam 3-5 hari kerja.</p>"}
            <p>Lo bisa bikin pesanan baru kapan aja di website kami.</p>
          </div>
          <div class="footer">HEUSE Luxury Menswear</div>
        </div>
      </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Order ${orderNumber} cancelled`,
      html,
    });
    if (result.error) {
      console.error(`[email] Resend error:`, result.error);
      return null;
    }
    console.log(`[email] Cancellation sent for ${orderNumber}`);
    return result.data ?? null;
  } catch (err) {
    console.error(`[email] Failed to send cancellation:`, err);
    return null;
  }
}
