import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, API_BASE } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderDetail {
  id: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  notes?: string;
  createdAt: string;
  user: {
    email: string;
    profile?: { firstName?: string; lastName?: string; phone?: string };
  };
  address: {
    title: string;
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    district: string;
    neighborhood?: string;
    postalCode?: string;
    address: string;
  };
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    variant: {
      sku: string;
      attributes: Record<string, string>;
      product: { name: string; images: { url: string }[] };
    };
  }[];
  statusHistory: { id: string; status: string; note?: string; createdAt: string }[];
  payment?: {
    provider: string;
    amount: number;
    status: string;
    transactionId?: string;
  };
  shipping?: {
    carrier?: string;
    trackingNumber?: string;
    status: string;
    estimatedAt?: string;
  } | null;
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

const STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:    { label: 'Bekliyor',     bg: 'bg-yellow-100', text: 'text-yellow-800' },
  PROCESSING: { label: 'Hazırlanıyor', bg: 'bg-blue-100',   text: 'text-blue-800'   },
  SHIPPED:    { label: 'Kargoda',      bg: 'bg-indigo-100', text: 'text-indigo-800' },
  DELIVERED:  { label: 'Teslim Edildi',bg: 'bg-green-100',  text: 'text-green-800'  },
  CANCELLED:  { label: 'İptal Edildi', bg: 'bg-red-100',    text: 'text-red-800'    },
  REFUNDED:   { label: 'İade Edildi',  bg: 'bg-gray-100',   text: 'text-gray-700'   },
};

const PAYMENT_META: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:  { label: 'Bekliyor',   bg: 'bg-yellow-100', text: 'text-yellow-800' },
  SUCCESS:  { label: 'Ödendi',     bg: 'bg-green-100',  text: 'text-green-800'  },
  FAILED:   { label: 'Başarısız',  bg: 'bg-red-100',    text: 'text-red-800'    },
  REFUNDED: { label: 'İade',       bg: 'bg-gray-100',   text: 'text-gray-700'   },
};

const PROVIDER_LABEL: Record<string, string> = {
  iyzico: 'İyzico',
  stripe: 'Stripe',
  cod:    'Kapıda Ödeme',
  bank:   'Havale/EFT',
  havale: 'Havale/EFT',
};

// Manuel onay gerektiren ödeme yöntemleri (online tahsilat değil)
const MANUAL_PAYMENT_PROVIDERS = ['havale', 'bank', 'cod'];

const STEPPER_STEPS = [
  { key: 'PENDING',    label: 'Sipariş Alındı' },
  { key: 'PROCESSING', label: 'Hazırlanıyor'    },
  { key: 'SHIPPED',    label: 'Kargoya Verildi' },
  { key: 'DELIVERED',  label: 'Teslim Edildi'   },
];

// ─── Utils ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return Number(n).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function stepIndex(status: string) {
  const i = STEPPER_STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ status, map }: { status: string; map: typeof STATUS_META }) {
  const m = map[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark ${className}`}>
      <div className="px-5 py-3.5 border-b border-stroke dark:border-strokedark">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-stroke/60 dark:border-strokedark/60 last:border-0">
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-black dark:text-white text-right">{value}</span>
    </div>
  );
}

function Stepper({ status }: { status: string }) {
  const isCancelled = ['CANCELLED', 'REFUNDED'].includes(status);
  const current = stepIndex(status);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-red-600">{STATUS_META[status]?.label}</p>
          <p className="text-xs text-gray-400">Bu sipariş tamamlanamadı.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-0">
      {STEPPER_STEPS.map((step, i) => {
        const done    = i <= current;
        const active  = i === current;
        const isLast  = i === STEPPER_STEPS.length - 1;
        return (
          <div key={step.key} className="flex-1 flex flex-col items-center">
            {/* Dot + line row */}
            <div className="flex items-center w-full">
              {i > 0 && (
                <div className={`flex-1 h-0.5 ${i <= current ? 'bg-primary' : 'bg-gray-200 dark:bg-strokedark'}`} />
              )}
              <div
                className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                  ${done
                    ? 'border-primary bg-primary'
                    : 'border-gray-300 bg-white dark:border-strokedark dark:bg-boxdark'
                  }
                  ${active ? 'ring-4 ring-primary/20' : ''}
                `}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span className="text-xs text-gray-400 font-semibold">{i + 1}</span>
                )}
              </div>
              {!isLast && (
                <div className={`flex-1 h-0.5 ${i < current ? 'bg-primary' : 'bg-gray-200 dark:bg-strokedark'}`} />
              )}
            </div>
            {/* Label */}
            <p className={`mt-2 text-[11px] text-center font-medium leading-tight ${
              active ? 'text-primary' : done ? 'text-black dark:text-white' : 'text-gray-400'
            }`}>
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id: orderId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder]           = useState<OrderDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Status update
  const [newStatus, setNewStatus]   = useState('');
  const [note, setNote]             = useState('');
  const [updating, setUpdating]     = useState(false);

  // Shipping update
  const [carrier, setCarrier]       = useState('');
  const [tracking, setTracking]     = useState('');
  const [shippingSaving, setShippingSaving] = useState(false);
  const [shippingOk, setShippingOk] = useState(false);
  const [copied, setCopied]         = useState(false);

  // Cancel confirm
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Invoice email
  const [invoiceSending, setInvoiceSending] = useState(false);
  const [invoiceOk, setInvoiceOk]           = useState(false);
  const [invoiceErr, setInvoiceErr]         = useState('');
  const [taxRate, setTaxRate]               = useState(20);

  useEffect(() => {
    api.get('/tax-config')
      .then((r) => {
        const rate = Number((r as any)?.data?.taxRate);
        if (Number.isFinite(rate) && rate >= 0) setTaxRate(rate);
      })
      .catch(() => {});
  }, []);

  async function handleSendInvoice() {
    setInvoiceSending(true);
    setInvoiceErr('');
    try {
      await api.post(`/admin/orders/${orderId}/send-invoice`, {});
      setInvoiceOk(true);
      setTimeout(() => setInvoiceOk(false), 4000);
    } catch (err) {
      setInvoiceErr(err instanceof Error ? err.message : 'E-posta gönderilemedi');
      setTimeout(() => setInvoiceErr(''), 5000);
    } finally {
      setInvoiceSending(false);
    }
  }

  async function printInvoice() {
    if (!order) return;

    const esc = (s: unknown) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    // Şirket bilgilerini API'den çek
    let company: {
      name: string; legalName: string; address: string; city: string;
      phone: string; email: string; taxOffice: string; taxNumber: string; logoUrl: string;
    } = { name: '', legalName: '', address: '', city: '', phone: '', email: '', taxOffice: '', taxNumber: '', logoUrl: '' };

    try {
      const r = await api.get('/company-info');
      company = (r as any)?.data ?? company;
    } catch (e) { console.warn('company-info yüklenemedi', e); }

    // Göreceli logo URL'sini absolute yap (print penceresi about:blank'tan açılıyor)
    const apiOrigin = API_BASE.replace(/\/api\/?$/, '');
    if (company.logoUrl && company.logoUrl.startsWith('/')) {
      company.logoUrl = `${apiOrigin}${company.logoUrl}`;
    }

    // KDV oranı (global) — fiyatlar KDV dahil, sadece toplam etiketinde gösterilir
    let vatRate = 20;
    try {
      const tr = await api.get('/tax-config');
      const rate = Number((tr as any)?.data?.taxRate);
      if (Number.isFinite(rate) && rate >= 0) vatRate = rate;
    } catch (e) { console.warn('tax-config yüklenemedi', e); }

    const orderRef = `TR-${order.id.slice(-8).toUpperCase()}`;
    const orderDate = new Date(order.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const subtotalN = Number(order.subtotal);   // KDV dahil (brüt)
    const discountN = Number(order.discount);   // iskonto (brüt)
    const totalN    = Number(order.total);      // KDV dahil (brüt)
    const fmtN      = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

    const itemRows = order.items.map((item, i) => {
      const attrs = Object.entries(item.variant.attributes ?? {}).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(' / ');
      const lineTotal = Number(item.unitPrice) * item.quantity;
      const bg = i % 2 === 1 ? 'background:#f9f9f9;' : '';
      return `
        <tr style="${bg}">
          <td style="padding:8px 10px;border-bottom:1px solid #ddd">
            <strong>${esc(item.variant.product.name)}</strong>
            ${attrs ? `<br><small style="color:#666">${attrs}</small>` : ''}
            <br><small style="color:#aaa;font-family:monospace">${esc(item.variant.sku)}</small>
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:center">${item.quantity}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:right">${fmtN(Number(item.unitPrice))}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:right"><strong>${fmtN(lineTotal)}</strong></td>
        </tr>`;
    }).join('');

    const customerName = order.user.profile?.firstName
      ? esc(`${order.user.profile.firstName} ${order.user.profile.lastName ?? ''}`.trim())
      : esc(order.user.email);

    const addrBlock = [
      esc(`${order.address.firstName} ${order.address.lastName}`),
      esc(order.address.phone),
      esc(order.address.address),
      [esc(order.address.neighborhood ?? ''), esc(order.address.district)].filter(Boolean).join(', '),
      [esc(order.address.city), esc(order.address.postalCode ?? '')].filter(Boolean).join(' '),
    ].filter(Boolean).join('<br>');

    const companyBlock = [
      esc(company.address),
      esc(company.city),
      company.phone ? `Tel: ${esc(company.phone)}` : '',
      company.email ? `E: ${esc(company.email)}` : '',
      company.taxOffice ? `Vergi Dairesi: ${esc(company.taxOffice)}` : '',
      company.taxNumber ? `Vergi No: ${esc(company.taxNumber)}` : '',
    ].filter(Boolean).join('<br>');

    const logoHtml = company.logoUrl
      ? `<img src="${esc(company.logoUrl)}" alt="logo" style="max-height:70px;max-width:160px;object-fit:contain;display:block;margin-bottom:6px">`
      : '';

    const PROVIDER_LABELS: Record<string, string> = { iyzico: 'İyzico', stripe: 'Stripe', cod: 'Kapıda Ödeme', bank: 'Havale/EFT' };
    const paymentLabel = order.payment ? (PROVIDER_LABELS[order.payment.provider] ?? order.payment.provider) : '';

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Fatura ${orderRef}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; background: #fff; }
  @page { size: A4; margin: 12mm 15mm; }
  @media print { body { margin: 0; } }

  .page { width: 100%; max-width: 780px; margin: 0 auto; padding: 20px; }

  /* ─── Header ─── */
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 3px solid #111; margin-bottom: 20px; }
  .header-left .title { font-size: 28px; font-weight: 900; letter-spacing: 1px; color: #111; line-height: 1.1; margin-top: 2px; }
  .header-right { text-align: right; }
  .header-right .company-name { font-size: 15px; font-weight: 700; letter-spacing: .3px; margin-bottom: 4px; }
  .header-right .company-addr { font-size: 11px; color: #444; line-height: 1.7; }

  /* ─── Customer + Order Info ─── */
  .info-grid { display: flex; gap: 0; margin-bottom: 24px; }
  .info-left { flex: 1; }
  .info-right { flex: 1; border-left: 2px solid #111; padding-left: 20px; }
  .info-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 6px; }
  .info-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 5px; }
  .info-row .lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #555; min-width: 120px; }
  .info-row .val { font-size: 12px; font-weight: 600; color: #111; }

  /* ─── Products Table ─── */
  .products-section { margin-bottom: 0; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #111; color: #fff; }
  thead th { padding: 9px 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; }
  thead th:nth-child(2) { text-align: center; }
  thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
  tbody td { font-size: 12px; vertical-align: top; }

  /* ─── Totals ─── */
  .totals-row { display: flex; justify-content: flex-end; margin-top: 0; border-top: 2px solid #111; }
  .totals-table { width: 280px; border-collapse: collapse; }
  .totals-table td { padding: 6px 10px; font-size: 12px; border-bottom: 1px solid #eee; }
  .totals-table .total-row td { font-size: 14px; font-weight: 700; border-bottom: none; border-top: 2px solid #111; padding-top: 8px; }

  /* ─── Footer ─── */
  .footer { margin-top: 30px; padding-top: 14px; border-top: 2px solid #111; display: flex; justify-content: space-between; align-items: flex-start; font-size: 10px; color: #666; }
  .footer-note { max-width: 320px; line-height: 1.7; }
  .footer-sign { text-align: right; }
  .footer-sign .sign-line { width: 140px; height: 1px; background: #111; margin: 30px 0 4px auto; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${logoHtml}<div class="title">İrsaliye Fatura</div>
    </div>
    <div class="header-right">
      <div class="company-name">${esc(company.legalName || company.name || 'Şirket Adı')}</div>
      ${companyBlock ? `<div class="company-addr">${companyBlock}</div>` : ''}
    </div>
  </div>

  <!-- Customer + Order Info -->
  <div class="info-grid">
    <div class="info-left">
      <div class="info-row"><span class="lbl">SAYIN</span><span class="val">${customerName}</span></div>
      <div class="info-row"><span class="lbl">E-POSTA</span><span class="val">${esc(order.user.email)}</span></div>
      <div class="info-row" style="margin-top:12px"><span class="lbl">TESLİMAT ADRESİ</span></div>
      <div style="font-size:11px;color:#333;line-height:1.8;padding-left:0">${addrBlock}</div>
    </div>
    <div class="info-right">
      <div class="info-row"><span class="lbl">FATURA NUMARASI</span><span class="val">${orderRef}</span></div>
      <div class="info-row"><span class="lbl">FATURA TARİHİ</span><span class="val">${orderDate}</span></div>
      ${paymentLabel ? `<div class="info-row"><span class="lbl">ÖDEME YÖNTEMİ</span><span class="val">${paymentLabel}</span></div>` : ''}
      <div class="info-row"><span class="lbl">SİPARİŞ DURUMU</span><span class="val">${({ PENDING:'Bekliyor', PROCESSING:'Hazırlanıyor', SHIPPED:'Kargoda', DELIVERED:'Teslim Edildi', CANCELLED:'İptal', REFUNDED:'İade' } as Record<string,string>)[order.status] ?? order.status}</span></div>
    </div>
  </div>

  <!-- Products Table -->
  <div class="products-section">
    <table>
      <thead>
        <tr>
          <th style="width:50%">ÜRÜN</th>
          <th style="width:12%">ADET</th>
          <th style="width:19%">BİRİM FİYAT</th>
          <th style="width:19%">ARA TOPLAM</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${discountN > 0 ? `<tr><td colspan="3" style="padding:8px 10px;border-bottom:1px solid #ddd;color:#16a34a;font-weight:bold">İskonto</td><td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:right;color:#16a34a;font-weight:bold">−${fmtN(discountN)}</td></tr>` : ''}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="totals-row">
    <table class="totals-table">
      <tr><td>Ara Toplam (KDV Dahil)</td><td style="text-align:right">${fmtN(subtotalN)}</td></tr>
      <tr class="total-row"><td><strong>GENEL TOPLAM${vatRate > 0 ? ` (%${vatRate} KDV Dahil)` : ''}</strong></td><td style="text-align:right"><strong>${fmtN(totalN)}</strong></td></tr>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-note">
      Bu belge bilgi amaçlıdır.<br>
      ${esc(company.legalName || company.name || 'Şirket Adı')}
      ${company.taxOffice ? `<br>Vergi Dairesi: ${esc(company.taxOffice)}` : ''}
      ${company.taxNumber ? `<br>Vergi No: ${esc(company.taxNumber)}` : ''}
    </div>
    <div class="footer-sign">
      <div class="sign-line"></div>
      <div>Kaşe / İmza</div>
    </div>
  </div>

</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=1100,scrollbars=yes');
    if (!win) { alert('Lütfen tarayıcı popup engelini devre dışı bırakın.'); return; }
    win.document.write(html);
    win.document.close();
  }

  function loadOrder() {
    setLoading(true);
    api.get<{ success: boolean; data: OrderDetail }>(`/admin/orders/${orderId}`)
      .then((r) => {
        setOrder(r.data);
        setNewStatus(r.data.status);
        setCarrier(r.data.shipping?.carrier ?? '');
        setTracking(r.data.shipping?.trackingNumber ?? '');
      })
      .catch(() => setError('Sipariş yüklenemedi.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (orderId) loadOrder(); }, [orderId]);

  const [paymentSaving, setPaymentSaving] = useState(false);
  async function updatePaymentStatus(status: 'SUCCESS' | 'PENDING') {
    if (!order) return;
    setPaymentSaving(true);
    try {
      await api.put(`/admin/orders/${orderId}/payment-status`, { status });
      loadOrder();
    } catch (e: any) {
      setError(e?.message ?? 'Ödeme durumu güncellenemedi.');
    } finally {
      setPaymentSaving(false);
    }
  }

  async function handleUpdateStatus() {
    if (!order) return;

    // Redirect to Cancellations if CANCELLED or REFUNDED selected
    if (['CANCELLED', 'REFUNDED'].includes(newStatus)) {
      navigate('/cancellations');
      return;
    }

    setUpdating(true);
    setError('');
    try {
      await api.put(`/admin/orders/${orderId}/status`, {
        status: newStatus,
        note: note.trim() || undefined,
      });
      setNote('');
      loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güncelleme hatası');
    } finally {
      setUpdating(false);
    }
  }

  async function handleSaveShipping() {
    setShippingSaving(true);
    try {
      await api.put(`/admin/orders/${orderId}/shipping`, {
        carrier: carrier.trim() || undefined,
        trackingNumber: tracking.trim() || undefined,
      });
      setShippingOk(true);
      setTimeout(() => setShippingOk(false), 3000);
      loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kargo güncelleme hatası');
    } finally {
      setShippingSaving(false);
    }
  }

  function copyTracking() {
    if (!tracking) return;
    navigator.clipboard.writeText(tracking);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-10 w-10 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-meta-1">{error}</p>
        <button onClick={() => navigate('/orders')} className="text-sm text-primary hover:underline">
          ← Siparişlere Dön
        </button>
      </div>
    );
  }

  if (!order) return null;

  // Fiyatlar KDV dahil — Excel gösterimi: brüt ara toplam − iskonto = toplam (KDV dahil)
  const subtotal = Number(order.subtotal);   // KDV dahil (brüt)
  const discount = Number(order.discount);   // iskonto (brüt)
  const total    = Number(order.total);      // KDV dahil (brüt)

  const customerName = order.user.profile?.firstName
    ? `${order.user.profile.firstName} ${order.user.profile.lastName ?? ''}`.trim()
    : '—';

  const isCancellable = ['PENDING', 'PROCESSING'].includes(order.status);

  return (
    <div className="print:bg-white">
      {/* ── Top Bar ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
            <Link to="/orders" className="hover:text-primary transition-colors">Siparişler</Link>
            <span>/</span>
            <span className="text-black dark:text-white font-medium">
              #{order.id.slice(-8).toUpperCase()}
            </span>
          </nav>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            Sipariş Detayı
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Email invoice feedback */}
          {invoiceOk && (
            <span className="text-xs text-green-600 font-medium px-2">Fatura e-postası gönderildi</span>
          )}
          {invoiceErr && (
            <span className="text-xs text-red-600 font-medium px-2">{invoiceErr}</span>
          )}

          {/* Send invoice email */}
          <button
            onClick={handleSendInvoice}
            disabled={invoiceSending}
            title={`Faturayı ${order.user.email} adresine gönder`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stroke bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4 transition disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {invoiceSending ? 'Gönderiliyor…' : 'Faturayı E-posta Gönder'}
          </button>

          <button
            onClick={printInvoice}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stroke bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Faturayı Yazdır
          </button>

          {isCancellable && !confirmCancel && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm font-medium hover:bg-red-100 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Siparişi İptal Et
            </button>
          )}

          {confirmCancel && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <span className="text-sm text-red-700">Emin misiniz?</span>
              <button
                onClick={async () => {
                  setConfirmCancel(false);
                  setUpdating(true);
                  try {
                    await api.put(`/admin/orders/${orderId}/status`, { status: 'CANCELLED' });
                    loadOrder();
                  } catch { setError('İptal edilemedi'); }
                  finally { setUpdating(false); }
                }}
                className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
              >
                İptal Et
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
              >
                Vazgeç
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm print:hidden">
          {error}
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ─ Left Column ─ */}
        <div className="flex flex-col gap-5">

          {/* Card 1: Sipariş Özeti */}
          <Card title="Satış & Sipariş Özeti">
            <InfoRow
              label="Sipariş No"
              value={
                <span className="font-mono text-primary font-bold">
                  #TR-{order.id.slice(-8).toUpperCase()}
                </span>
              }
            />
            <InfoRow label="Sipariş Tarihi"  value={fmtDate(order.createdAt)} />
            <InfoRow label="Toplam Tutar"    value={<span className="text-lg font-bold text-black dark:text-white">{fmt(total)}</span>} />
            <InfoRow
              label="Ödeme Yöntemi"
              value={
                order.payment ? (
                  <span className="flex flex-col items-end gap-1">
                    <span>{PROVIDER_LABEL[order.payment.provider] ?? order.payment.provider}</span>
                    <Badge status={order.payment.status} map={PAYMENT_META} />
                    {order.payment.transactionId && (
                      <span className="text-[10px] text-gray-400 font-mono">{order.payment.transactionId}</span>
                    )}
                    {MANUAL_PAYMENT_PROVIDERS.includes(order.payment.provider) && order.payment.status === 'PENDING' && (
                      <button
                        onClick={() => updatePaymentStatus('SUCCESS')}
                        disabled={paymentSaving}
                        className="mt-1 inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {paymentSaving ? 'Onaylanıyor…' : '✓ Havale Geldi — Ödemeyi Onayla'}
                      </button>
                    )}
                    {MANUAL_PAYMENT_PROVIDERS.includes(order.payment.provider) && order.payment.status === 'SUCCESS' && (
                      <button
                        onClick={() => updatePaymentStatus('PENDING')}
                        disabled={paymentSaving}
                        className="mt-0.5 text-[10px] text-gray-400 hover:text-red-500 underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        {paymentSaving ? '…' : 'Onayı geri al'}
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )
              }
            />
            <InfoRow
              label="Sipariş Durumu"
              value={<Badge status={order.status} map={STATUS_META} />}
            />
            {order.notes && (
              <InfoRow
                label="Müşteri Notu"
                value={<span className="text-xs italic text-gray-500">{order.notes}</span>}
              />
            )}
          </Card>

          {/* Card 2: Müşteri Bilgileri */}
          <Card title="Müşteri Bilgileri">
            <InfoRow label="Ad Soyad"  value={customerName} />
            <InfoRow label="E-posta"   value={order.user.email} />
            <InfoRow
              label="Telefon"
              value={order.user.profile?.phone ?? <span className="text-gray-400">—</span>}
            />
            <div className="mt-3 pt-3 border-t border-stroke/60 dark:border-strokedark/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Teslimat Adresi</p>
              <p className="text-sm font-medium text-black dark:text-white">
                {order.address.firstName} {order.address.lastName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{order.address.phone}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {order.address.address}<br />
                {order.address.neighborhood ? `${order.address.neighborhood}, ` : ''}
                {order.address.district} / {order.address.city}
                {order.address.postalCode ? ` ${order.address.postalCode}` : ''}
              </p>
            </div>
          </Card>

          {/* Card: Durum Güncelle (print'te gizle) */}
          <Card title="Durum Güncelle" className="print:hidden">
            <div className="space-y-3">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-meta-4 dark:text-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s]?.label}</option>
                ))}
              </select>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Not (isteğe bağlı)"
                className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:text-white"
              />
              <button
                onClick={handleUpdateStatus}
                disabled={updating || newStatus === order.status && !note.trim()}
                className="w-full rounded-lg bg-primary text-white py-2 text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
              >
                {updating ? 'Kaydediliyor...' : 'Güncelle'}
              </button>
            </div>
          </Card>
        </div>

        {/* ─ Right Column (2/3) ─ */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Card 3: Ürün Tablosu */}
          <Card title="Sipariş Edilen Ürünler">
            <div className="overflow-x-auto -mx-5 -mt-5 mb-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-meta-4 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">Ürün</th>
                    <th className="px-5 py-3 text-left">Varyant / SKU</th>
                    <th className="px-5 py-3 text-center">Adet</th>
                    <th className="px-5 py-3 text-right">Birim Fiyat</th>
                    <th className="px-5 py-3 text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => {
                    const img   = item.variant.product.images[0]?.url;
                    const attrs = Object.entries(item.variant.attributes ?? {});
                    return (
                      <tr
                        key={item.id}
                        className={`${i < order.items.length - 1 ? 'border-b border-stroke dark:border-strokedark' : ''}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                              {img
                                ? <img src={img} alt={item.variant.product.name} className="h-full w-full object-cover" />
                                : <span className="text-xs text-gray-300">?</span>
                              }
                            </div>
                            <span className="font-medium text-black dark:text-white line-clamp-2 leading-tight">
                              {item.variant.product.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {attrs.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {attrs.map(([k, v]) => (
                                <span key={k} className="bg-gray-100 dark:bg-meta-4 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-md">
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                          <p className="text-[10px] text-gray-400 font-mono mt-1">{item.variant.sku}</p>
                        </td>
                        <td className="px-5 py-4 text-center font-medium">{item.quantity}</td>
                        <td className="px-5 py-4 text-right">{fmt(Number(item.unitPrice))}</td>
                        <td className="px-5 py-4 text-right font-semibold text-black dark:text-white">
                          {fmt(Number(item.unitPrice) * item.quantity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Fiyat kırılımı */}
            <div className="border-t border-stroke dark:border-strokedark mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Ara Toplam (KDV Dahil)</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>İskonto</span>
                  <span>−{fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-black dark:text-white border-t border-stroke dark:border-strokedark pt-2 mt-1">
                <span>Genel Toplam{taxRate > 0 ? ` (%${taxRate} KDV Dahil)` : ''}</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
          </Card>

          {/* Card 4: Kargo & Lojistik */}
          <Card title="Kargo & Lojistik">
            {/* Stepper */}
            <div className="mb-6">
              <Stepper status={order.status} />
            </div>

            {order.shipping ? (
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div className="rounded-lg bg-gray-50 dark:bg-meta-4 p-4">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Kargo Firması</p>
                  <p className="text-sm font-semibold text-black dark:text-white">
                    {order.shipping.carrier || <span className="text-gray-400 font-normal">Belirtilmemiş</span>}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-meta-4 p-4">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Takip Numarası</p>
                  {order.shipping.trackingNumber ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold text-black dark:text-white">
                        {order.shipping.trackingNumber}
                      </span>
                      <button
                        onClick={copyTracking}
                        title="Kopyala"
                        className="shrink-0 text-gray-400 hover:text-primary transition-colors"
                      >
                        {copied ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Henüz girilmedi</span>
                  )}
                </div>
                {order.shipping.estimatedAt && (
                  <div className="rounded-lg bg-gray-50 dark:bg-meta-4 p-4 sm:col-span-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Tahmini Teslimat</p>
                    <p className="text-sm font-semibold text-black dark:text-white">
                      {fmtDateShort(order.shipping.estimatedAt)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-5 rounded-lg bg-gray-50 dark:bg-meta-4 p-4 text-sm text-gray-400 text-center">
                Sipariş "Kargoda" durumuna alındığında kargo bilgileri burada görünür.
              </div>
            )}

            {/* Kargo bilgisi düzenleme */}
            {order.shipping && (
              <div className="border-t border-stroke dark:border-strokedark pt-4 print:hidden">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Kargo Bilgisi Güncelle</p>
                {shippingOk && (
                  <div className="mb-3 rounded bg-green-50 border border-green-200 text-green-700 px-3 py-2 text-xs">
                    Kargo bilgileri kaydedildi.
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <input
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="Kargo firması (MNG, Yurtiçi…)"
                    className="flex-1 min-w-[160px] rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  />
                  <input
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    placeholder="Takip numarası"
                    className="flex-1 min-w-[160px] rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:text-white"
                  />
                  <button
                    onClick={handleSaveShipping}
                    disabled={shippingSaving}
                    className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 shrink-0 transition"
                  >
                    {shippingSaving ? 'Kaydediliyor…' : 'Kaydet'}
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Durum Geçmişi */}
          {order.statusHistory.length > 0 && (
            <Card title="Sipariş Geçmişi">
              <ol className="relative border-l border-stroke dark:border-strokedark ml-2 space-y-0">
                {order.statusHistory.map((log, i) => (
                  <li key={log.id} className={`ml-4 pb-4 ${i === order.statusHistory.length - 1 ? 'pb-0' : ''}`}>
                    <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-primary mt-1" />
                    <div className="flex items-center flex-wrap gap-2">
                      <Badge status={log.status} map={STATUS_META} />
                      <span className="text-xs text-gray-400">{fmtDate(log.createdAt)}</span>
                    </div>
                    {log.note && (
                      <p className="text-xs text-gray-500 mt-1 ml-0.5">{log.note}</p>
                    )}
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
}
