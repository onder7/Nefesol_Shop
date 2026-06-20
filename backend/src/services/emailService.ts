import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { getStoreName, getSettingsGroup } from './settingsService';

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
            'notif_smtp_pass', 'notif_smtp_from_email', 'notif_smtp_from_name',
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
        from: m.smtp_from_email || 'noreply@example.com',
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// {{ad}}, {{siparis_no}} gibi değişkenleri doldurur
function applyVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

// Düz metin şablon gövdesini güvenli HTML kabuğuna sarar
function wrapTemplateHtml(bodyText: string, opts?: { extraHtml?: string }): string {
  const paragraphs = escapeHtml(bodyText)
    .split('\n')
    .map((line) => (line.trim() === '' ? '<div style="height:8px"></div>' : `<p style="margin:0 0 12px;line-height:1.6">${line}</p>`))
    .join('');

  const ordersUrl = `${env.FRONTEND_URL}/hesabim/siparisler`;

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      ${paragraphs}
      ${opts?.extraHtml ?? ''}
      <p style="margin:24px 0">
        <a href="${ordersUrl}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Siparişlerimi Görüntüle
        </a>
      </p>
    </div>
  `;
}

// Sipariş durum şablonları — panel boşsa bu varsayılanlar kullanılır
type OrderTemplatePrefix = 'order_received' | 'order_shipped' | 'order_delivered';

const ORDER_TEMPLATE_DEFAULTS: Record<OrderTemplatePrefix, { label: string; subject: string; body: string }> = {
  order_received: {
    label: 'Alındı',
    subject: 'Siparişiniz Alındı — #{{siparis_no}}',
    body: 'Sayın {{ad}},\n\nSiparişiniz (#{{siparis_no}}) başarıyla alındı. Toplam tutar: {{toplam}}.\n\nSiparişinizi hesabınızdan takip edebilirsiniz. Bizi tercih ettiğiniz için teşekkürler!\n\n{{magaza}}',
  },
  order_shipped: {
    label: 'Kargoya Verildi',
    subject: 'Siparişiniz Kargoya Verildi — #{{siparis_no}}',
    body: 'Sayın {{ad}},\n\nSiparişiniz (#{{siparis_no}}) kargoya verildi ve yola çıktı. Kargo durumunu hesabınızdan takip edebilirsiniz.\n\n{{magaza}}',
  },
  order_delivered: {
    label: 'Teslim Edildi',
    subject: 'Siparişiniz Teslim Edildi — #{{siparis_no}}',
    body: 'Sayın {{ad}},\n\nSiparişiniz (#{{siparis_no}}) teslim edildi. Umarız beğenirsiniz!\n\nGörüşlerinizi ürün sayfasından bizimle paylaşabilirsiniz. Bizi tercih ettiğiniz için teşekkürler.\n\n{{magaza}}',
  },
};

interface OrderTemplateVars {
  ad: string;        // müşteri adı
  siparis_no: string;
  toplam?: string;
}

/**
 * Paneldeki düzenlenebilir şablonu (notif_<prefix>_subject/body) okuyup,
 * değişkenleri doldurarak müşteriye e-posta gönderir.
 */
export async function sendOrderTemplateEmail(
  to: string,
  prefix: OrderTemplatePrefix,
  vars: OrderTemplateVars,
  extraHtml?: string,
): Promise<void> {
  const def = ORDER_TEMPLATE_DEFAULTS[prefix];
  const [settings, storeName] = await Promise.all([
    getSettingsGroup('notif_').catch(() => ({} as Record<string, string>)),
    getStoreName(),
  ]);

  const allVars: Record<string, string> = {
    ad: vars.ad?.trim() || 'Müşterimiz',
    siparis_no: vars.siparis_no,
    toplam: vars.toplam ?? '',
    durum: def.label,
    magaza: storeName,
  };

  const subjectTpl = settings[`${prefix}_subject`]?.trim() || def.subject;
  const bodyTpl = settings[`${prefix}_body`]?.trim() || def.body;

  const subject = applyVars(subjectTpl, allVars);
  const html = wrapTemplateHtml(applyVars(bodyTpl, allVars), { extraHtml });

  await sendMail({ to, subject, html });
}

// ─── Admin Uyarıları ──────────────────────────────────────────────────────────

interface AdminAlertSettings {
  recipients: string[];
  newOrder: boolean;
  lowStock: boolean;
  newReview: boolean;
}

async function getAdminAlertSettings(): Promise<AdminAlertSettings> {
  const s = await getSettingsGroup('notif_').catch(() => ({} as Record<string, string>));
  const recipients = (s['admin_email'] || '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
  return {
    recipients,
    newOrder: s['new_order_alert'] === 'true',
    lowStock: s['low_stock_alert'] === 'true',
    newReview: s['new_review_alert'] === 'true',
  };
}

function adminShell(title: string, inner: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2563eb">${escapeHtml(title)}</h2>
      ${inner}
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">Bu otomatik bir yönetici bildirimidir.</p>
    </div>
  `;
}

export async function notifyAdminNewOrder(info: {
  orderId: string;
  customerName: string;
  total: number;
  itemCount: number;
}): Promise<void> {
  const cfg = await getAdminAlertSettings();
  if (!cfg.newOrder || cfg.recipients.length === 0) return;

  const orderRef = info.orderId.slice(-8).toUpperCase();
  const inner = `
    <p>Yeni bir sipariş alındı.</p>
    <table style="border-collapse:collapse;margin-top:8px">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Sipariş No</td><td style="font-weight:bold">#${orderRef}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Müşteri</td><td>${escapeHtml(info.customerName || '—')}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Ürün adedi</td><td>${info.itemCount}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Toplam</td><td style="font-weight:bold">${formatPrice(info.total)}</td></tr>
    </table>
  `;
  await sendMail({
    to: cfg.recipients.join(', '),
    subject: `🛒 Yeni Sipariş — #${orderRef}`,
    html: adminShell('Yeni Sipariş', inner),
  });
}

export async function notifyAdminLowStock(
  items: Array<{ name: string; sku: string; stock: number }>,
): Promise<void> {
  const cfg = await getAdminAlertSettings();
  if (!cfg.lowStock || cfg.recipients.length === 0 || items.length === 0) return;

  const rows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(i.name)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;color:#6b7280">${escapeHtml(i.sku)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;color:${i.stock <= 0 ? '#dc2626' : '#d97706'}">${i.stock}</td>
        </tr>`,
    )
    .join('');
  const inner = `
    <p>Aşağıdaki ürünlerin stoğu kritik seviyeye indi:</p>
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:6px 12px;text-align:left">Ürün</th>
          <th style="padding:6px 12px;text-align:left">SKU</th>
          <th style="padding:6px 12px;text-align:right">Kalan</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  await sendMail({
    to: cfg.recipients.join(', '),
    subject: `⚠️ Stok Uyarısı — ${items.length} ürün`,
    html: adminShell('Düşük Stok Uyarısı', inner),
  });
}

export async function notifyAdminNewReview(info: {
  productName: string;
  rating: number;
  author: string;
  title?: string;
  body?: string;
}): Promise<void> {
  const cfg = await getAdminAlertSettings();
  if (!cfg.newReview || cfg.recipients.length === 0) return;

  const stars = '★'.repeat(info.rating) + '☆'.repeat(5 - info.rating);
  const inner = `
    <p>Yeni bir ürün değerlendirmesi yapıldı (onay bekliyor).</p>
    <table style="border-collapse:collapse;margin-top:8px">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Ürün</td><td style="font-weight:bold">${escapeHtml(info.productName)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Müşteri</td><td>${escapeHtml(info.author || '—')}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Puan</td><td style="color:#f59e0b">${stars} (${info.rating}/5)</td></tr>
    </table>
    ${info.title ? `<p style="margin-top:12px;font-weight:bold">${escapeHtml(info.title)}</p>` : ''}
    ${info.body ? `<p style="color:#374151">${escapeHtml(info.body)}</p>` : ''}
    <p style="color:#6b7280;font-size:13px;margin-top:12px">Onaylamak için admin panelindeki Değerlendirmeler sayfasını ziyaret edin.</p>
  `;
  await sendMail({
    to: cfg.recipients.join(', '),
    subject: `⭐ Yeni Değerlendirme — ${info.productName}`,
    html: adminShell('Yeni Değerlendirme', inner),
  });
}

// ─── Public Functions ─────────────────────────────────────────────────────────

export async function sendOrderConfirmation(
  to: string,
  orderId: string,
  total: number,
  items: Array<{ name: string; quantity: number; unitPrice: number }>,
  customerName = '',
): Promise<void> {
  const orderRef = orderId.slice(-8).toUpperCase();

  const rows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(i.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${formatPrice(i.unitPrice)}</td>
        </tr>`,
    )
    .join('');

  // Sipariş kalemleri tablosu — şablon gövdesinin altına eklenir
  const itemsTable = `
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
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
  `;

  await sendOrderTemplateEmail(
    to,
    'order_received',
    { ad: customerName, siparis_no: orderRef, toplam: formatPrice(total) },
    itemsTable,
  );
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

export async function sendCartReminderEmail(
  to: string,
  customerName: string,
  items: Array<{ name: string; quantity: number; unitPrice: number }>,
  total: number,
): Promise<void> {
  const cartUrl = `${env.FRONTEND_URL}/sepet`;
  const storeName = await getStoreName();
  const greetingName = customerName?.trim() || 'Değerli Müşterimiz';

  const rows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(i.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${formatPrice(i.unitPrice)}</td>
        </tr>`,
    )
    .join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#2563eb">Sepetinizi unutmayın!</h2>
      <p>Merhaba ${escapeHtml(greetingName)},</p>
      <p>Sepetinizde tamamlanmayı bekleyen ürünleriniz var. Stoklar tükenmeden siparişinizi tamamlayabilirsiniz.</p>
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
      <p style="margin:24px 0">
        <a href="${cartUrl}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Sepete Git
        </a>
      </p>
      <p style="color:#666;font-size:14px">${storeName}'i tercih ettiğiniz için teşekkürler.</p>
    </div>
  `;

  await sendMail({ to, subject: 'Sepetinizde ürünler sizi bekliyor 🛒', html });
}

export async function sendMarketingEmail(
  emails: string[],
  subject: string,
  htmlContent: string,
): Promise<void> {
  const cfg = await resolveEmailConfig();
  if (cfg.method === 'none') {
    logger.warn('Toplu e-posta gönderilemedi: Geçerli bir SMTP/Brevo yapılandırması bulunamadı.');
    return;
  }

  // Güvenli HTML kabuğuna sarmala (aynı tasarım dilini kullanmak için)
  const wrappedHtml = wrapTemplateHtml(htmlContent);

  if (cfg.method === 'brevo') {
    // Brevo API allows sending to multiple recipients at once using bcc
    // But sending to up to 50 recipients at a time is safer
    const chunkSize = 50;
    for (let i = 0; i < emails.length; i += chunkSize) {
      const chunk = emails.slice(i, i + chunkSize);
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': cfg.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: cfg.senderName, email: cfg.senderEmail },
          bcc: chunk.map((email) => ({ email })),
          subject,
          htmlContent: wrappedHtml,
        }),
      });
    }
    logger.info(`Toplu e-posta gönderildi (Brevo API) - ${emails.length} alıcı`);
    return;
  }

  // SMTP yöntemi
  if (cfg.method === 'smtp') {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });

    const chunkSize = 50;
    for (let i = 0; i < emails.length; i += chunkSize) {
      const chunk = emails.slice(i, i + chunkSize);
      await transport.sendMail({
        from: `"${cfg.fromName}" <${cfg.from}>`,
        bcc: chunk, // Hide emails from each other
        subject,
        html: wrappedHtml,
      });
    }
    logger.info(`Toplu e-posta gönderildi (SMTP) - ${emails.length} alıcı`);
    return;
  }
}
