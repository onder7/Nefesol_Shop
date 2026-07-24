import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import * as hj from './hepsijetService';

// ─────────────────────────────────────────────────────────────────────────────
// Sipariş → HepsiJET gönderi oluşturma.
//
// sendDeliveryOrderEnhanced kullanılır: ZPL barkod + takip numarası döner.
// Sonuç Shipping kaydına yazılır, tekrar denemede aynı customerDeliveryNo
// yeniden kullanılır (HepsiJET tarafında mükerrer kayıt oluşmasın diye).
// ─────────────────────────────────────────────────────────────────────────────

type OrderForShipment = Prisma.OrderGetPayload<{
  include: {
    address: true;
    user: { select: { email: true; profile: { select: { phone: true } } } };
    shipping: true;
  };
}>;

async function loadOrder(orderId: string): Promise<OrderForShipment> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      address: true,
      user: { select: { email: true, profile: { select: { phone: true } } } },
      shipping: true,
    },
  });
  if (!order) throw Object.assign(new Error('Sipariş bulunamadı'), { status: 404 });
  if (!order.address) throw Object.assign(new Error('Siparişte teslimat adresi yok'), { status: 400 });
  return order;
}

/** Türkiye saatiyle YYYY-MM-DD. Container TZ=UTC olduğunda tarih kayması olmasın diye. */
function istanbulDate(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
  return parts; // en-CA → "2026-07-18"
}

/**
 * Aynı girdiden hep aynı UUID'yi üretir. HepsiJET her gönderi için ayrı
 * companyCustomerId / companyAddressId istiyor; sipariş bazında deterministik
 * üretmek hem bu koşulu sağlar hem de tekrar denemede aynı değeri verir.
 */
function uuidFrom(seed: string): string {
  const h = crypto.createHash('sha256').update(seed).digest('hex');
  return [h.slice(0, 8), h.slice(8, 12), '4' + h.slice(13, 16), '8' + h.slice(17, 20), h.slice(20, 32)].join('-');
}

/** 05xxxxxxxxx biçimine normalize eder. */
function normalizePhone(raw: string | null | undefined): string {
  const d = (raw ?? '').replace(/\D/g, '');
  if (d.length === 10) return `0${d}`;                    // 5xxxxxxxxx
  if (d.length === 12 && d.startsWith('90')) return `0${d.slice(2)}`; // 905xxxxxxxxx
  if (d.length === 13 && d.startsWith('090')) return d.slice(2);
  return d;
}

/** customerDeliveryNo: 8-21 karakter, 3 haneli firma koduyla başlamalı. */
function buildDeliveryNo(prefix: string): string {
  return `${prefix}${String(Date.now()).slice(-12)}`; // 3 + 12 = 15 karakter
}

/** HX_STD ve HJ_DT sabit 0 slot kullanır; SD/ND için gün içi dilim gerekir. */
function slotFor(productCode: string): string {
  return productCode === 'HX_SD' || productCode === 'HX_ND' ? '1' : '0';
}

export interface ShipmentResult {
  trackingNumber: string | null;
  deliveryNo: string;
  hasLabel: boolean;
  carrier: string;
  alreadyExists?: boolean;
}

/** Sipariş için HepsiJET gönderisi oluşturur. */
export async function createShipment(orderId: string): Promise<ShipmentResult> {
  const cfg = await hj.getConfig();
  hj.assertConfigured(cfg);

  const order = await loadOrder(orderId);
  const addr = order.address!;

  if (order.shipping?.trackingNumber) {
    throw Object.assign(
      new Error(`Bu sipariş için zaten kargo oluşturulmuş (${order.shipping.trackingNumber}).`),
      { status: 409 },
    );
  }

  // Alıcı adresi dokümandaki eşlemeye göre gönderiliyor: town = ilçe, district = mahalle.
  // DİKKAT: HepsiJET'in tanım mailinde gönderici adresi için tersi verilmişti
  // (town = mahalle, district = ilçe). Gönderici tarafı ayarlardan mailde yazan
  // haliyle gidiyor. Doküman + findAvailableDeliveryDatesV2 örneği town=ilçe diyor;
  // HepsiJET teyit ederse bu eşlemenin de değişmesi gerekebilir (çapraz kargo riski).
  //
  // Address.neighborhood opsiyonel; boşsa ilçeyi gönderiyoruz (mahalle adres satırında var).
  const neighborhood = addr.neighborhood?.trim() || addr.district;
  if (!addr.neighborhood?.trim()) {
    logger.warn('HepsiJET: mahalle bilgisi yok, ilçe gönderiliyor', { orderId, district: addr.district });
  }

  const phone = normalizePhone(addr.phone || order.user?.profile?.phone);
  if (!phone) {
    throw Object.assign(new Error('Teslimat adresinde geçerli telefon numarası yok'), { status: 400 });
  }

  const deliveryNo = order.shipping?.deliveryNo || buildDeliveryNo(cfg.deliveryPrefix);
  const country = { name: 'Türkiye' };

  const payload: hj.HjDeliveryOrder = {
    company: { name: cfg.companyName, abbreviationCode: cfg.companyCode },
    delivery: {
      customerDeliveryNo: deliveryNo,
      customerOrderId: order.id.slice(-8).toUpperCase(),
      totalParcels: '1',
      desi: cfg.defaultDesi,
      deliverySlotOriginal: slotFor(cfg.productCode),
      deliveryDateOriginal: istanbulDate(),
      deliveryType: 'RETAIL',
      product: { productCode: cfg.productCode },
      senderAddress: {
        companyAddressId: cfg.senderAddressId,
        country,
        city: { name: cfg.senderCity },
        town: { name: cfg.senderTown },
        district: { name: cfg.senderDistrict || cfg.senderTown },
        addressLine1: cfg.senderAddressLine,
      },
      receiver: {
        companyCustomerId: uuidFrom(`customer:${order.id}`),
        firstName: addr.firstName,
        lastName: addr.lastName,
        phone1: phone,
        phone2: '',
        email: order.user?.email ?? '',
      },
      recipientAddress: {
        companyAddressId: uuidFrom(`address:${order.id}`),
        country,
        city: { name: addr.city },
        town: { name: addr.district },
        district: { name: neighborhood },
        addressLine1: addr.address,
      },
      recipientPerson: `${addr.firstName} ${addr.lastName}`.trim(),
      recipientPersonPhone1: phone,
    },
    currentXDock: { abbreviationCode: cfg.xdockCode },
  };

  let response: hj.HjEnhancedResponse;
  try {
    response = await hj.sendDeliveryOrderEnhanced(cfg, payload);
  } catch (err) {
    const msg = String(err);
    // 409: gönderi bu numarayla HepsiJET'te zaten kayıtlı → mükerrer basış. Mevcut
    // kaydı "oluşturuldu" sayıp döndür (500 vermek yerine idempotent davran).
    if (/\b409\b|kay[ıi]tl[ıi]/i.test(msg)) {
      const existing = await prisma.shipping.findUnique({ where: { orderId } });
      const trackingNumber = existing?.trackingNumber || deliveryNo;
      await prisma.shipping
        .upsert({
          where: { orderId },
          update: { carrier: 'HepsiJET', trackingNumber, deliveryNo },
          create: { orderId, carrier: 'HepsiJET', trackingNumber, deliveryNo },
        })
        .catch(() => {});
      logger.info('HepsiJET gönderi zaten mevcut (409), mükerrer oluşturma atlandı', { orderId, deliveryNo });
      return { trackingNumber, deliveryNo, hasLabel: Boolean(existing?.barcodeData), carrier: 'HepsiJET', alreadyExists: true };
    }
    // Başarısız denemede de deliveryNo'yu saklıyoruz ki tekrar denerken aynısı kullanılsın.
    await prisma.shipping.upsert({
      where: { orderId },
      update: { deliveryNo, payload: { request: payload as object, error: String(err) } },
      create: { orderId, carrier: 'HepsiJET', deliveryNo, payload: { request: payload as object, error: String(err) } },
    });
    throw err;
  }

  // HepsiJET takibi customerDeliveryNo (barkod) üzerinden yapılır; ayrı bir takip no
  // dönmezse barkodu takip numarası olarak kullanırız (müşteri bununla takip eder).
  const trackingNumber = response.data?.trackingNumber ?? deliveryNo;
  const barcodeData = response.data?.barcodeData ?? null;

  await prisma.shipping.upsert({
    where: { orderId },
    update: {
      carrier: 'HepsiJET',
      trackingNumber,
      deliveryNo,
      barcodeData,
      payload: { request: payload as object, response: response as object },
    },
    create: {
      orderId,
      carrier: 'HepsiJET',
      trackingNumber,
      deliveryNo,
      barcodeData,
      payload: { request: payload as object, response: response as object },
    },
  });

  logger.info('HepsiJET gönderisi oluşturuldu', { orderId, deliveryNo, trackingNumber });

  return { trackingNumber, deliveryNo, hasLabel: Boolean(barcodeData), carrier: 'HepsiJET' };
}

export interface TrackingResult {
  trackingNumber: string | null;
  trackingUrl: string | null;
}

/**
 * HepsiJET'ten gönderi takip bilgisini (customerDeliveryNo/barkod ile) sorgular ve
 * kaydı günceller. Takip numarası = barkod; ayrıca resmi takip URL'i döner.
 */
export async function refreshTracking(orderId: string): Promise<TrackingResult> {
  const shipping = await prisma.shipping.findUnique({ where: { orderId } });
  if (!shipping?.deliveryNo) {
    throw Object.assign(new Error('Bu sipariş için HepsiJET gönderisi bulunamadı'), { status: 404 });
  }
  const cfg = await hj.getConfig();
  hj.assertConfigured(cfg);

  const items = await hj.queryTracking(cfg, [shipping.deliveryNo]);
  const item = items.find((i) => i.barcode === shipping.deliveryNo) ?? items[0];
  const trackingUrl = (item?.trackingUrl as string | undefined) ?? null;
  const trackingNumber = shipping.trackingNumber || shipping.deliveryNo;

  await prisma.shipping.update({
    where: { orderId },
    data: {
      trackingNumber,
      ...(item ? { payload: { ...(shipping.payload as object ?? {}), track: item } as object } : {}),
    },
  });

  logger.info('HepsiJET takip bilgisi güncellendi', { orderId, deliveryNo: shipping.deliveryNo, trackingUrl });
  return { trackingNumber, trackingUrl };
}

/** Kayıtlı ZPL etiket verisini döner. */
export async function getLabel(orderId: string): Promise<string> {
  const shipping = await prisma.shipping.findUnique({ where: { orderId } });
  if (!shipping?.barcodeData) {
    throw Object.assign(new Error('Bu sipariş için kayıtlı kargo etiketi yok'), { status: 404 });
  }
  return shipping.barcodeData;
}

/** Admin panelinde gönderi oluşturmadan payload'ı görmek için (hata ayıklama). */
export async function previewPayload(orderId: string): Promise<object> {
  const cfg = await hj.getConfig();
  const order = await loadOrder(orderId);
  const addr = order.address!;
  const country = { name: 'Türkiye' };
  const phone = normalizePhone(addr.phone || order.user?.profile?.phone);
  return {
    company: { name: cfg.companyName, abbreviationCode: cfg.companyCode },
    delivery: {
      customerDeliveryNo: order.shipping?.deliveryNo || `${cfg.deliveryPrefix}(üretilecek)`,
      customerOrderId: order.id.slice(-8).toUpperCase(),
      totalParcels: '1',
      desi: cfg.defaultDesi,
      deliverySlotOriginal: slotFor(cfg.productCode),
      deliveryDateOriginal: istanbulDate(),
      deliveryType: 'RETAIL',
      product: { productCode: cfg.productCode },
      senderAddress: {
        companyAddressId: cfg.senderAddressId,
        country,
        city: { name: cfg.senderCity },
        town: { name: cfg.senderTown },
        district: { name: cfg.senderDistrict || cfg.senderTown },
        addressLine1: cfg.senderAddressLine,
      },
      receiver: {
        companyCustomerId: uuidFrom(`customer:${order.id}`),
        firstName: addr.firstName,
        lastName: addr.lastName,
        phone1: phone,
        phone2: '',
        email: order.user?.email ?? '',
      },
      recipientAddress: {
        companyAddressId: uuidFrom(`address:${order.id}`),
        country,
        city: { name: addr.city },
        town: { name: addr.district },
        district: { name: addr.neighborhood?.trim() || addr.district },
        addressLine1: addr.address,
      },
      recipientPerson: `${addr.firstName} ${addr.lastName}`.trim(),
      recipientPersonPhone1: phone,
    },
    currentXDock: { abbreviationCode: cfg.xdockCode },
  };
}
