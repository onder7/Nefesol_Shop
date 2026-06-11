import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { getStoreName } from './settingsService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmtpConfig {
  method: 'smtp';
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  fromName: string;
}

interface BrevoConfig {
  method: 'brevo';
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

interface NoneConfig {
  method: 'none';
}

type EmailConfig = SmtpConfig | BrevoConfig | NoneConfig;

// ─── Config Resolution (env → DB) ────────────────────────────────────────────

async function resolveEmailConfig(): Promise<EmailConfig> {
  // Marka adı ayarlardan gelir (kurulumda girilen mağaza adı)
  const storeName = await getStoreName();

  // 1. SMTP from env (highest priority)
  if (env.SMTP_HOST) {
    return {
      method: 'smtp',
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.SMTP_FROM ?? 'noreply@example.com',
      fromName: storeName,
    };
  }

  // 2. Brevo from env
  if (env.BREVO_API_KEY) {
    return {
      method: 'brevo',
      apiKey: env.BREVO_API_KEY,
      senderEmail: env.BREVO_SENDER_EMAIL ?? 'noreply@example.com',
      senderName: env.BREVO_SENDER_NAME ?? storeName,
    };
  }

  // 3. SMTP from DB (admin panel settings)
  try {
    const { prisma } = await import('../config/database');
    const rows = await prisma.siteSettings.findMany({
      where: {
        key: {
          in: [
            'notif_smtp_host', 'notif_smtp_port', 'notif_smtp_user',
            'notif_smtp_pass', 'notif_smtp_from', 'notif_smtp_from_name',
          ],
        },
      },
    });
    const m = Object.fromEntries(rows.map((r) => [r.key.slice('notif_'.length), r.value]));
    if (m.smtp_host) {
      return {
        method: 'smtp',
        host: m.smtp_host,
        port: Number(m.smtp_port) || 587,
        user: m.smtp_user || undefined,
        pass: m.smtp_pass || undefined,
        from: m.smtp_from || 'noreply@example.com',
        fromName: m.smtp_from_name || storeName,
      };
    }

    // 4. Brevo from DB (admin panel settings)
    const brevoRows = await prisma.siteSettings.findMany({
      where: {
        key: {
          in: ['notif_brevo_api_key', 'notif_brevo_sender_email', 'notif_brevo_sender_name'],
        },
      },
    });
    const bm = Object.fromEntries(brevoRows.map((r) => [r.key.slice('notif_'.length), r.value]));
    if (bm.brevo_api_key) {
      return {
        method: 'brevo',
        apiKey: bm.brevo_api_key,
        senderEmail: bm.brevo_sender_email || 'noreply@example.com',
        senderName: bm.brevo_sender_name || storeName,
      };
    }
  } catch (err) {
    logger.warn('Email config DB okunamadı, env değerlerine dönülüyor', { err });
  }

  return { method: 'none' };
}

// ─── Core Send ────────────────────────────────────────────────────────────────

interface MailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendViaBrevo(cfg: BrevoConfig, payload: MailPayload): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': cfg.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: cfg.senderName, email: cfg.senderEmail },
      to: [{ email: payload.to }],
      subject: payload.subject,
      htmlContent: payload.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API hatası ${res.status}: ${body}`);
  }
}

async function sendMail(payload: MailPayload): Promise<void> {
  const cfg = await resolveEmailConfig();

  if (cfg.method === 'smtp') {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
    await transport.sendMail({
      from: `"${cfg.fromName}" <${cfg.from}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    logger.info('Email gönderildi (SMTP)', { to: payload.to, host: cfg.host });
    return;
  }

  if (cfg.method === 'brevo') {
    await sendViaBrevo(cfg, payload);
    logger.info('Email gönderildi (Brevo API)', { to: payload.to });
    return;
  }

  logger.info('Email transport yok — loglandı', { to: payload.to, subject: payload.subject });
}

// ─── Status Helper (for admin controller) ────────────────────────────────────

export async function getEmailStatus(): Promise<{
  method: 'smtp' | 'brevo' | 'none';
  source: 'env' | 'db' | 'none';
  details: Record<string, string | number | boolean>;
}> {
  // Determine source separately so we can report it
  const hasEnvSmtp  = !!env.SMTP_HOST;
  const hasEnvBrevo = !!env.BREVO_API_KEY;

  const cfg = await resolveEmailConfig();

  if (cfg.method === 'smtp') {
    return {
      method: 'smtp',
      source: hasEnvSmtp ? 'env' : 'db',
      details: { host: cfg.host, port: cfg.port, from: cfg.from },
    };
  }
  if (cfg.method === 'brevo') {
    return {
      method: 'brevo',
      source: hasEnvBrevo ? 'env' : 'db',
      details: {
        senderEmail: cfg.senderEmail,
        senderName: cfg.senderName,
        keySet: true,
      },
    };
  }
  return { method: 'none', source: 'none', details: {} };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

// ─── Public Functions ─────────────────────────────────────────────────────────

export async function sendOrderConfirmation(
  to: string,
  orderId: string,
  total: number,
  items: Array<{ name: string; quantity: number; unitPrice: number }>,
): Promise<void> {
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
      <h2 style="color:#2563eb">Siparişiniz Alındı!</h2>
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

  await sendMail({ to, subject: `Siparişiniz Onaylandı — #${orderRef}`, html });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/sifre-sifirla?token=${token}`;

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

  await sendMail({ to, subject: 'Şifre Sıfırlama Talebi', html });
}

export async function sendOrderStatusUpdate(
  to: string,
  orderId: string,
  status: string,
  statusLabel: string,
): Promise<void> {
  const orderRef = orderId.slice(-8).toUpperCase();
  const ordersUrl = `${env.FRONTEND_URL}/hesabim/siparisler`;
  const storeName = await getStoreName();

  const statusColors: Record<string, string> = {
    CONFIRMED:  '#16a34a',
    PROCESSING: '#2563eb',
    SHIPPED:    '#7c3aed',
    DELIVERED:  '#16a34a',
    CANCELLED:  '#dc2626',
  };
  const color = statusColors[status] ?? '#374151';

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2563eb">Sipariş Durumu Güncellendi</h2>
      <p>Sipariş No: <strong>#${orderRef}</strong></p>
      <p style="margin:16px 0">
        Siparişinizin durumu güncellendi:
        <span style="font-weight:bold;color:${color}">${statusLabel}</span>
      </p>
      <p style="margin:24px 0">
        <a href="${ordersUrl}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Siparişlerimi Görüntüle
        </a>
      </p>
      <p style="color:#666;font-size:14px">${storeName}'i tercih ettiğiniz için teşekkürler.</p>
    </div>
  `;

  await sendMail({ to, subject: `Sipariş Durumu: ${statusLabel} — #${orderRef}`, html });
}
