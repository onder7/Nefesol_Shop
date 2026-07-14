import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { getTaxConfig } from './settingsService';
import * as sysmond from './sysmondService';

// ─────────────────────────────────────────────────────────────────────────────
// Sipariş → Sysmond e-Dönüşüm fatura entegrasyonu.
//
// Fiyat modeli: ürün fiyatları KDV DAHİL saklanır.
// Sysmond'a NET (KDV hariç) birim fiyat + vatRate gönderilir;
// isCalculateByApi=true ile tüm tutarlar Sysmond tarafından hesaplanır.
// ─────────────────────────────────────────────────────────────────────────────

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    items: { include: { variant: { include: { product: { select: { name: true } } } } } };
    address: true;
    invoice: true;
  };
}>;

async function loadOrder(orderId: string): Promise<OrderWithRelations> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { variant: { include: { product: { select: { name: true } } } } } },
      address: true,
      invoice: true,
    },
  });
  if (!order) throw Object.assign(new Error('Sipariş bulunamadı'), { status: 404 });
  return order;
}

/** Sipariş verilerinden Sysmond fatura satırlarını üretir. */
async function buildLineItems(order: OrderWithRelations): Promise<sysmond.FaturaLineItem[]> {
  const { taxRate } = await getTaxConfig();
  const div = 1 + taxRate / 100;

  const subtotalGross = Number(order.subtotal);
  const discount = Number(order.discount);
  const shippingFee = Number(order.shippingFee);

  const grossItems = order.items.map((it) => Number(it.unitPrice) * it.quantity);

  // İskontoyu satırlara oransal dağıt
  const discountShares: number[] = [];
  let allocated = 0;
  grossItems.forEach((g, i) => {
    if (i === grossItems.length - 1) {
      discountShares.push(round2(discount - allocated));
    } else {
      const share = subtotalGross > 0 ? round2((discount * g) / subtotalGross) : 0;
      discountShares.push(share);
      allocated += share;
    }
  });

  const lines: sysmond.FaturaLineItem[] = order.items.map((it, i) => {
    const grossAfterDiscount = round2(grossItems[i] - discountShares[i]);
    const netTotal = round2(grossAfterDiscount / div);
    const netUnit = round2(netTotal / it.quantity);
    const taxAmount = round2(netTotal * taxRate / 100);
    return {
      productName: it.variant.product.name,
      quantity: it.quantity,
      unitCode: 'C62',
      unitPrice: netUnit,
      vatRate: taxRate,
      malHizmetKaydet: false,
      tax: [{ taxName: 'KDV', taxCode: '0015', taxRate, taxAmount }],
    };
  });

  if (shippingFee > 0) {
    const KARGO_KDV = 20; // Taşımacılık hizmeti KDV oranı %20 (sabit, ürün oranından bağımsız)
    const kargoDiv = 1 + KARGO_KDV / 100;
    const netUnit = round2(shippingFee / kargoDiv);
    const taxAmount = round2(netUnit * KARGO_KDV / 100);
    lines.push({
      productName: 'Kargo / Teslimat Bedeli',
      quantity: 1,
      unitCode: 'C62',
      unitPrice: netUnit,
      vatRate: KARGO_KDV,
      malHizmetKaydet: false,
      tax: [{ taxName: 'KDV', taxCode: '0015', taxRate: KARGO_KDV, taxAmount }],
    });
  }

  return lines;
}

type Profile = 'TEMELFATURA' | 'EARSIVFATURA';

interface InvoiceTarget {
  profile: Profile;
  pkAlias?: string; // e-Fatura alıcı posta kutusu etiketi
}

/**
 * Faturanın profilini (e-Fatura/e-Arşiv) ve varsa alıcı posta kutusunu belirler.
 *
 * - Bireysel (TCKN)               → her zaman e-Arşiv (mevcut davranış, dokunulmaz)
 * - Kurumsal (VKN) + e-Fatura mükellefi → e-Fatura (TEMELFATURA) + alıcı etiketi
 * - Kurumsal (VKN) ama mükellef değil   → VKN'li e-Arşiv (yasal, her alıcıya kesilebilir)
 * - Mükellef sorgusu hata verirse        → güvenli tarafa: VKN'li e-Arşiv
 */
async function resolveInvoiceTarget(order: OrderWithRelations): Promise<InvoiceTarget> {
  // Bireysel: hiç sorgu yapmadan e-Arşiv (bugünkü çalışan akış).
  if (!order.isCorporate || !order.taxNumber) {
    return { profile: 'EARSIVFATURA' };
  }
  // Kurumsal: VKN gerçekten e-Fatura mükellefi mi? (alias dönerse evet)
  try {
    const alias = await sysmond.getEFaturaAlias(order.taxNumber);
    if (alias) {
      return { profile: 'TEMELFATURA', pkAlias: alias };
    }
    logger.info(`VKN ${order.taxNumber} e-Fatura mükellefi değil, VKN'li e-Arşiv kesilecek (order ${order.id})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`e-Fatura mükellef sorgusu başarısız (VKN ${order.taxNumber}), e-Arşiv'e düşülüyor: ${msg}`);
  }
  return { profile: 'EARSIVFATURA' };
}

/** Fatura tipine göre belge seri öneki. e-Fatura ve e-Arşiv GİB'de ayrı serilerdir. */
function pickInvoicePrefix(profile: 'TEMELFATURA' | 'EARSIVFATURA'): string {
  return profile === 'TEMELFATURA'
    ? (process.env.SYSMOND_PREFIX_EFATURA ?? 'MAB')   // e-Fatura
    : (process.env.SYSMOND_PREFIX_EARSIV ?? 'GLB');   // e-Arşiv
}

// ─── Orkestrasyon ────────────────────────────────────────────────────────────

export interface IssueResult {
  status: 'SENT' | 'ERROR' | 'QUEUED';
  ettn?: string;
  invoiceNo?: string;
  profile?: string;
  errorMessage?: string;
}

/** Sipariş için e-Fatura/e-Arşiv keser. Mükerrer gönderimi engeller. */
export async function issueInvoice(orderId: string): Promise<IssueResult> {
  const order = await loadOrder(orderId);

  if (order.invoice && ['QUEUED', 'SENT'].includes(order.invoice.status)) {
    throw Object.assign(new Error('Bu sipariş için zaten fatura kesilmiş'), { status: 409 });
  }

  if (!sysmond.isConfigured()) {
    throw Object.assign(
      new Error('Sysmond e-Dönüşüm yapılandırılmamış (SYSMOND_USERNAME/PASSWORD env değişkeni eksik)'),
      { status: 400 },
    );
  }

  const ettn = crypto.randomUUID();
  const refNo = crypto.randomUUID();
  const { profile, pkAlias } = await resolveInvoiceTarget(order);
  const type = profile === 'TEMELFATURA' ? 'EFATURA' : 'EARSIV';
  const a = order.address;
  const fullName = `${a.firstName} ${a.lastName}`.trim();

  const invoiceDetail = await buildLineItems(order);

  // docDate: Sysmond "2026-07-07T00:00:00" formatı bekliyor (Z yok, ms yok)
  const now = new Date();
  const docDate = now.toISOString().split('.')[0]; // "2026-07-07T11:23:45"

  // docNo: PREFIX + YIL + 9 haneli timestamp sonu (Sysmond format: "MAB2026000001234")
  // Seri öneki fatura tipine göre seçilir: e-Fatura=MAB, e-Arşiv=GLB.
  const invoicePrefix = pickInvoicePrefix(profile);
  const year = now.getFullYear();
  const seq = String(now.getTime()).slice(-9);
  const docNo = `${invoicePrefix}${year}${seq}`;

  const faturaItem: sysmond.FaturaItem = {
    profile,
    invoiceType: 'SATIS',
    ettn,
    docDate,
    docNo,
    currencyCode: 'TRY',
    isDraft: false,
    ...(profile === 'EARSIVFATURA' ? { senderType: 'ELEKTRONIK' } : {}),
    ...(pkAlias ? { pkAlias } : {}),
    invoiceAccount: {
      vknTckn: order.isCorporate ? (order.taxNumber ?? '') : (order.identityNo ?? '11111111111'),
      accountName: order.isCorporate ? (order.billingName || fullName) : fullName,
      taxOfficeName: order.taxOffice ?? undefined,
      countryName: 'Türkiye',
      cityName: a.city,
      citySubdivision: a.district || a.city,
      streetName: [a.neighborhood, a.address].filter(Boolean).join(' '),
      postalCode: a.postalCode ?? undefined,
      telephone: a.phone,
    },
    invoiceDetail,
    notes: [`Sipariş No: TR-${order.id.slice(-8).toUpperCase()}`],
    isCalculateByApi: true,
    refNo,
  };

  // DRAFT kaydı
  await prisma.invoice.upsert({
    where: { orderId },
    create: { orderId, type, status: 'DRAFT', ettn, profile },
    update: { type, status: 'DRAFT', ettn, profile, invoiceNo: null, errorMessage: null },
  });

  try {
    const res = await sysmond.createInvoice([faturaItem]);

    if (!res.status) {
      const msg = res.exceptionMessage ?? res.message ?? res.errorList?.join('; ') ?? 'Fatura oluşturulamadı';
      await prisma.invoice.update({
        where: { orderId },
        data: { status: 'ERROR', errorMessage: msg.slice(0, 500), providerResponse: res as any },
      });
      logger.warn(`Sysmond fatura reddedildi (order ${orderId}): ${msg}`);
      return { status: 'ERROR', errorMessage: msg, ettn };
    }

    const item = res.data?.[0];
    if (!item?.status) {
      const msg = item?.exceptionMessage ?? item?.message ?? 'Fatura kaydı başarısız';
      await prisma.invoice.update({
        where: { orderId },
        data: { status: 'ERROR', errorMessage: msg.slice(0, 500), providerResponse: res as any },
      });
      logger.warn(`Sysmond fatura öğe hatası (order ${orderId}): ${msg}`);
      return { status: 'ERROR', errorMessage: msg, ettn };
    }

    const realEttn = item.ettn ?? ettn;
    const invoiceNo = item.documentNo ?? undefined;

    await prisma.invoice.update({
      where: { orderId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        ettn: realEttn,
        invoiceNo: invoiceNo ?? null,
        providerResponse: res as any,
        errorMessage: null,
      },
    });
    logger.info(`Sysmond fatura kesildi (order ${orderId}, ETTN ${realEttn}, No ${invoiceNo ?? '–'})`);
    return { status: 'SENT', ettn: realEttn, invoiceNo, profile };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.invoice.update({ where: { orderId }, data: { status: 'ERROR', errorMessage: message } }).catch(() => {});
    logger.error(`Sysmond fatura gönderim hatası (order ${orderId}): ${message}`);
    return { status: 'ERROR', errorMessage: message, ettn };
  }
}

/** GİB durumunu ETTN ile sorgular, kaydı günceller. */
export async function refreshStatus(orderId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { orderId } });
  if (!invoice?.ettn) throw Object.assign(new Error('Fatura bulunamadı'), { status: 404 });

  const [statusItem] = await sysmond.getStatus([invoice.ettn]);
  if (!statusItem) throw Object.assign(new Error('Durum bilgisi alınamadı'), { status: 502 });

  const update: Record<string, unknown> = { providerResponse: statusItem as any };
  const s = statusItem.status?.toUpperCase() ?? '';

  // Sysmond durum stringleri: BASARILI, GONDERILDI, HATALI, REDDEDILDI, ...
  if (['BASARILI', 'GONDERILDI', 'ILETILDI', 'KABUL_EDILDI'].includes(s)) {
    update.status = 'SENT';
    if (!invoice.sentAt) update.sentAt = new Date();
    if (statusItem.docNo) update.invoiceNo = statusItem.docNo;
    update.errorMessage = null;
  } else if (['HATALI', 'REDDEDILDI', 'IPTAL'].includes(s)) {
    update.status = 'REJECTED';
    update.errorMessage = (statusItem.gibStatusMessage ?? statusItem.description ?? s).slice(0, 500);
  }

  await prisma.invoice.update({ where: { orderId }, data: update });
  return statusItem;
}

/** Fatura PDF'ini ETTN ile indirir. */
export async function getInvoicePdf(orderId: string): Promise<Buffer> {
  const invoice = await prisma.invoice.findUnique({ where: { orderId } });
  if (!invoice?.ettn) throw Object.assign(new Error('Fatura bulunamadı'), { status: 404 });
  if (invoice.status === 'DRAFT' || invoice.status === 'ERROR') {
    throw Object.assign(new Error('Fatura henüz gönderilmemiş'), { status: 400 });
  }
  return sysmond.downloadPdf(invoice.ettn);
}

export async function getInvoice(orderId: string) {
  return prisma.invoice.findUnique({ where: { orderId } });
}

export interface CancelResult {
  status: 'CANCELLED' | 'ERROR';
  message?: string;
}

/** e-Arşiv faturasını Sysmond üzerinden iptal eder. Yalnızca EARSIVFATURA profili destekler. */
export async function cancelInvoice(orderId: string): Promise<CancelResult> {
  const invoice = await prisma.invoice.findUnique({ where: { orderId } });
  if (!invoice) throw Object.assign(new Error('Fatura bulunamadı'), { status: 404 });
  if (invoice.status === 'CANCELLED') throw Object.assign(new Error('Fatura zaten iptal edilmiş'), { status: 409 });
  if (invoice.status !== 'SENT') throw Object.assign(new Error('Yalnızca SENT durumundaki faturalar iptal edilebilir'), { status: 400 });
  if (invoice.profile !== 'EARSIVFATURA') throw Object.assign(new Error('Yalnızca e-Arşiv faturaları bu yolla iptal edilebilir'), { status: 400 });
  if (!invoice.ettn) throw Object.assign(new Error('Fatura ETTN bilgisi eksik'), { status: 400 });

  const res = await sysmond.cancelEArsiv([invoice.ettn]);

  if (!res.status) {
    const msg = res.exceptionMessage ?? res.message ?? 'İptal başarısız';
    await prisma.invoice.update({ where: { orderId }, data: { errorMessage: msg.slice(0, 500) } });
    logger.warn(`e-Arşiv iptal başarısız (order ${orderId}): ${msg}`);
    return { status: 'ERROR', message: msg };
  }

  await prisma.invoice.update({
    where: { orderId },
    data: { status: 'CANCELLED', errorMessage: null, providerResponse: res as any },
  });
  logger.info(`e-Arşiv iptal edildi (order ${orderId}, ETTN ${invoice.ettn})`);
  return { status: 'CANCELLED' };
}

/** Sysmond'a gönderilecek JSON gövdesini önizler (test / debug). */
export async function previewPayload(orderId: string): Promise<object> {
  const order = await loadOrder(orderId);
  const invoiceDetail = await buildLineItems(order);
  const a = order.address;
  const fullName = `${a.firstName} ${a.lastName}`.trim();
  const previewDate = new Date();
  const docDate = previewDate.toISOString().split('.')[0];
  const { profile, pkAlias } = await resolveInvoiceTarget(order);
  const invoicePrefix = pickInvoicePrefix(profile);
  const docNo = `${invoicePrefix}${previewDate.getFullYear()}${String(previewDate.getTime()).slice(-9)}`;
  return {
    profile,
    invoiceType: 'SATIS',
    ettn: '(üretilecek)',
    docDate,
    docNo,
    currencyCode: 'TRY',
    isDraft: false,
    ...(profile === 'EARSIVFATURA' ? { senderType: 'ELEKTRONIK' } : {}),
    ...(pkAlias ? { pkAlias } : {}),
    invoiceAccount: {
      vknTckn: order.isCorporate ? (order.taxNumber ?? '') : (order.identityNo ?? '11111111111'),
      accountName: order.isCorporate ? (order.billingName || fullName) : fullName,
      taxOfficeName: order.taxOffice ?? undefined,
      cityName: a.city,
      citySubdivision: a.district || a.city,
      streetName: [a.neighborhood, a.address].filter(Boolean).join(' '),
    },
    invoiceDetail,
    isCalculateByApi: true,
  };
}
