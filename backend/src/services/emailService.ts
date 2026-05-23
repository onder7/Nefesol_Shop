import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

function createTransport() {
  if (!env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
}

function formatPrice(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

export async function sendOrderConfirmation(
  to: string,
  orderId: string,
  total: number,
  items: Array<{ name: string; quantity: number; unitPrice: number }>,
) {
  const orderRef = orderId.slice(-8).toUpperCase();

  const rows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${i.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${formatPrice(i.unitPrice)}</td>
        </tr>`,
    )
    .join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2563eb">Siparişiniz Alındı! 🎉</h2>
      <p>Sipariş No: <strong>#${orderRef}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:8px 12px;text-align:left">Ürün</th>
            <th style="padding:8px 12px;text-align:center">Adet</th>
            <th style="padding:8px 12px;text-align:right">Fiyat</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:18px;font-weight:bold;text-align:right;margin-top:16px">
        Toplam: ${formatPrice(total)}
      </p>
      <p style="color:#666;margin-top:24px">
        Siparişinizi hesabınızdan takip edebilirsiniz.
        Bizi tercih ettiğiniz için teşekkürler!
      </p>
    </div>
  `;

  const transport = createTransport();
  if (!transport) {
    logger.info('SMTP yapılandırılmadı — sipariş emaili loglandı', { to, orderId: orderRef, total });
    return;
  }

  await transport.sendMail({
    from: env.SMTP_FROM ?? 'noreply@mabridgeglobal.com',
    to,
    subject: `Siparişiniz Onaylandı — #${orderRef}`,
    html,
  });

  logger.info('Sipariş onay emaili gönderildi', { to, orderId: orderRef });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${env.FRONTEND_URL ?? 'http://localhost:5173'}/sifre-sifirla?token=${token}`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2563eb">Şifre Sıfırlama</h2>
      <p>Hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Şifremi Sıfırla
        </a>
      </p>
      <p style="color:#666;font-size:14px">Bu link 1 saat geçerlidir. Eğer bu talebi siz yapmadıysanız bu emaili görmezden gelebilirsiniz.</p>
    </div>
  `;

  const transport = createTransport();
  if (!transport) {
    logger.info('Şifre sıfırlama linki (SMTP yok)', { to, resetUrl });
    return;
  }

  await transport.sendMail({
    from: env.SMTP_FROM ?? 'noreply@mabridgeglobal.com',
    to,
    subject: 'Şifre Sıfırlama Talebi',
    html,
  });
}
