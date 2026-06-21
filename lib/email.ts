/**
 * Email service using SMTP (Gmail).
 *
 * Setup:
 *   1. Enable 2FA on Gmail account
 *   2. Create App Password at https://myaccount.google.com/apppasswords
 *   3. Set env vars in Railway:
 *      - SMTP_HOST=smtp.gmail.com
 *      - SMTP_PORT=587
 *      - SMTP_USER=heuseofficials@gmail.com
 *      - SMTP_PASS=<16-char app password>
 *      - EMAIL_FROM (optional, e.g., "HEUSE <heuseofficials@gmail.com>")
 *
 * Why SMTP (not Resend):
 *   - Works WITHOUT a custom domain (Resend needs one)
 *   - Free up to ~500 emails/day
 *   - Sends as your actual Gmail address (heuseofficials@gmail.com)
 *
 * Functions:
 *   - sendOrderConfirmation: After successful payment
 *   - sendOrderShipped: When admin marks order as shipped
 *   - sendOrderCancelled: When order is cancelled
 */

import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM = process.env.EMAIL_FROM || (SMTP_USER ? `HEUSE <${SMTP_USER}>` : "HEUSE <noreply@heuse.local>");

let transporter: nodemailer.Transporter | null = null;
let lastInitWarning: string | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    const msg = `[email] SMTP not configured (SMTP_HOST/USER/PASS missing) — emails will fail silently`;
    if (lastInitWarning !== msg) {
      console.warn(msg);
      lastInitWarning = msg;
    }
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  console.log(`[email] SMTP transporter initialized (host=${SMTP_HOST}, port=${SMTP_PORT}, user=${SMTP_USER})`);
  return transporter;
}

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

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  context: string;
}): Promise<{ id: string } | null> {
  const tx = getTransporter();
  if (!tx) {
    console.warn(`[email] SMTP not configured, skipping ${params.context}`);
    return null;
  }

  try {
    const result = await tx.sendMail({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    console.log(`[email] ${params.context} sent to ${params.to} (messageId=${result.messageId})`);
    return { id: result.messageId };
  } catch (err) {
    console.error(`[email] Failed to send ${params.context} to ${params.to}:`, err);
    return null;
  }
}

export async function sendOrderConfirmation(params: {
  email: string;
  customerName: string;
  orderNumber: string;
  total: number;
  items: OrderItem[];
  siteUrl: string;
  /** Raw tracking token for the /track page link (1-year TTL). */
  trackingToken?: string;
}): Promise<{ id: string } | null> {
  const { email, customerName, orderNumber, total, items, siteUrl, trackingToken } = params;

  // /track link (1-year magic link). Falls back to /account if no token
  // (legacy emails where trackingToken wasn't generated yet).
  const trackLink = trackingToken
    ? `${siteUrl}/track/${encodeURIComponent(orderNumber)}?token=${encodeURIComponent(trackingToken)}`
    : `${siteUrl}/account`;

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
            <p style="margin-top:24px;font-size:13px;color:#666;">
              💌 Save link ini buat cek status pesanan kapan aja (valid 1 tahun):
            </p>
            <a href="${trackLink}" style="display:inline-block;background:transparent;color:#1a1a1a !important;padding:10px 20px;text-decoration:none;margin-top:8px;font-size:12px;letter-spacing:1px;text-transform:uppercase;border:1px solid #1a1a1a;">
              📦 Track Pesanan
            </a>
          </div>
          <div class="footer">
            HEUSE Luxury Menswear · Ada pertanyaan? Hubungi cs@heuse.com
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Order ${orderNumber} confirmed`,
    html,
    context: `Order confirmation for ${orderNumber}`,
  });
}

export async function sendOrderShipped(params: {
  email: string;
  customerName: string;
  orderNumber: string;
  trackingNumber?: string;
  trackingToken?: string;
  siteUrl: string;
}): Promise<{ id: string } | null> {
  const { email, customerName, orderNumber, trackingNumber, trackingToken, siteUrl } = params;

  const trackLink = trackingToken
    ? `${siteUrl}/track/${encodeURIComponent(orderNumber)}?token=${encodeURIComponent(trackingToken)}`
    : `${siteUrl}/account`;

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
            <a href="${trackLink}" class="btn">Track Order</a>
          </div>
          <div class="footer">HEUSE Luxury Menswear</div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Order ${orderNumber} shipped`,
    html,
    context: `Shipping notification for ${orderNumber}`,
  });
}

export async function sendOrderCancelled(params: {
  email: string;
  customerName: string;
  orderNumber: string;
  reason?: string;
  refunded: boolean;
}): Promise<{ id: string } | null> {
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

  return sendEmail({
    to: email,
    subject: `Order ${orderNumber} cancelled`,
    html,
    context: `Cancellation for ${orderNumber}`,
  });
}