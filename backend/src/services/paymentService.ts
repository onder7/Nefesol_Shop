import crypto from 'crypto';
import { env } from '../config/env';
import { prisma } from '../config/database';

// ─── Iyzico Config (env > DB hybrid) ──────────────────────────────────────────
interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

/**
 * Iyzico ayarlarını çözer: önce .env, yoksa admin panelinde kayıtlı (payment_*) değerler.
 */
async function resolveIyzicoConfig(): Promise<IyzicoConfig> {
  // 1) .env öncelikli
  if (env.IYZICO_API_KEY && env.IYZICO_SECRET_KEY) {
    return { apiKey: env.IYZICO_API_KEY, secretKey: env.IYZICO_SECRET_KEY, baseUrl: env.IYZICO_BASE_URL };
  }
  // 2) Admin panel (DB) ayarları
  try {
    const rows = await prisma.siteSettings.findMany({
      where: { key: { in: ['payment_iyzico_api_key', 'payment_iyzico_secret', 'payment_iyzico_env'] } },
    });
    const m = Object.fromEntries(rows.map((r) => [r.key.slice('payment_'.length), r.value]));
    if (m.iyzico_api_key && m.iyzico_secret) {
      return {
        apiKey: m.iyzico_api_key,
        secretKey: m.iyzico_secret,
        baseUrl: m.iyzico_env === 'live' ? 'https://api.iyzipay.com' : 'https://sandbox-api.iyzipay.com',
      };
    }
  } catch {
    // DB okunamazsa aşağıdaki env fallback'e düş
  }
  return { apiKey: env.IYZICO_API_KEY ?? '', secretKey: env.IYZICO_SECRET_KEY ?? '', baseUrl: env.IYZICO_BASE_URL };
}

// ─── Iyzico Types ─────────────────────────────────────────────────────────────

export interface IyzicoAddress {
  address: string;
  zipCode: string;
  contactName: string;
  city: string;
  country: string;
}

export interface CheckoutFormRequest {
  conversationId: string;
  price: string;
  paidPrice: string;
  buyer: {
    id: string;
    name: string;
    surname: string;
    identityNumber: string;
    email: string;
    registrationDate: string;
    lastLoginDate: string;
    registrationAddress: string;
    city: string;
    country: string;
    ip: string;
    zipCode?: string;
  };
  shippingAddress: IyzicoAddress;
  billingAddress: IyzicoAddress;
  basketItems: Array<{
    id: string;
    name: string;
    price: string;
    category1: string;
    itemType: 'PHYSICAL' | 'VIRTUAL';
  }>;
  callbackUrl: string;
}

export interface CheckoutFormResponse {
  status: string;
  checkoutFormContent?: string;
  token?: string;
  errorMessage?: string;
  errorCode?: string;
}

export interface PaymentDetailResponse {
  status: string;
  paymentStatus?: string;
  paymentId?: string;
  conversationId?: string;
  errorMessage?: string;
}

// ─── PKI string (Iyzico canonical format) ────────────────────────────────────

function toPkiString(obj: Record<string, unknown>): string {
  let str = '[';
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      str += `${key}=`;
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        for (const item of value) str += toPkiString(item as Record<string, unknown>);
      } else {
        str += `[${(value as unknown[]).join(', ')}]`;
      }
      str += ', ';
    } else if (typeof value === 'object' && value !== null) {
      str += `${key}=${toPkiString(value as Record<string, unknown>)}, `;
    } else {
      str += `${key}=${String(value)}, `;
    }
  }
  str += ']';
  return str;
}

function authHeaders(body: Record<string, unknown>, cfg: IyzicoConfig) {
  const apiKey = cfg.apiKey;
  const secretKey = cfg.secretKey;
  const randomKey = Date.now().toString();
  const pkiStr = toPkiString(body);
  const hash = crypto
    .createHash('sha1')
    .update(apiKey + randomKey + secretKey + pkiStr, 'utf8')
    .digest('base64');
  return {
    Authorization: `IYZWS ${apiKey}:${hash}`,
    'x-iyzi-rnd': randomKey,
    'x-iyzi-client-version': 'iyzipay-node-2.0.50',
  };
}

async function post<T>(path: string, body: Record<string, unknown>, cfg: IyzicoConfig): Promise<T> {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders(body, cfg) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Iyzico HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Dev bypass form (no Iyzico credentials) ─────────────────────────────────

function devCheckoutForm(conversationId: string, apiBase: string): CheckoutFormResponse {
  const callbackUrl = `${apiBase}/api/checkout/dev-callback`;
  return {
    status: 'success',
    token: `dev_${conversationId}`,
    checkoutFormContent: `
      <div style="padding:24px;border:2px dashed #94a3b8;border-radius:12px;text-align:center;background:#f8fafc;font-family:sans-serif">
        <p style="font-size:20px;font-weight:700;color:#1e40af;margin:0 0 8px">🧪 Test Ödeme Modu</p>
        <p style="color:#64748b;margin:0 0 16px;font-size:14px">Iyzico API anahtarı yapılandırılmadı.<br>Bu buton gerçek ödeme simüle eder.</p>
        <button
          onclick="fetch('${callbackUrl}?conversationId=${conversationId}',{method:'POST'}).then(r=>r.json()).then(d=>{if(d.redirectUrl)window.location.href=d.redirectUrl})"
          style="padding:14px 36px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer"
        >
          Ödemeyi Tamamla (Test)
        </button>
      </div>`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function isConfigured(): Promise<boolean> {
  const cfg = await resolveIyzicoConfig();
  return !!(cfg.apiKey && cfg.secretKey);
}

export async function initializeCheckoutForm(
  req: CheckoutFormRequest,
  apiBase: string,
): Promise<CheckoutFormResponse> {
  const cfg = await resolveIyzicoConfig();
  if (!cfg.apiKey || !cfg.secretKey) return devCheckoutForm(req.conversationId, apiBase);

  return post<CheckoutFormResponse>(
    '/payment/iyzipos/checkoutform/initialize/auth/ecom',
    {
      locale: 'tr',
      conversationId: req.conversationId,
      price: req.price,
      paidPrice: req.paidPrice,
      currency: 'TRY',
      basketId: req.conversationId,
      paymentGroup: 'PRODUCT',
      callbackUrl: req.callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: req.buyer,
      shippingAddress: req.shippingAddress,
      billingAddress: req.billingAddress,
      basketItems: req.basketItems,
    },
    cfg,
  );
}

export async function retrieveCheckoutForm(token: string): Promise<PaymentDetailResponse> {
  const cfg = await resolveIyzicoConfig();
  if (!cfg.apiKey || !cfg.secretKey) return { status: 'success', paymentStatus: 'SUCCESS' };

  return post<PaymentDetailResponse>(
    '/payment/iyzipos/checkoutform/auth/ecom/detail',
    { locale: 'tr', token },
    cfg,
  );
}
