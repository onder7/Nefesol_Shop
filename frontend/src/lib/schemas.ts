const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined) ??
  (typeof window !== 'undefined' ? window.location.origin : 'https://www.mabridgeglobal.com');

// ── Organization ──────────────────────────────────────────────────────────────

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MaBridge Global',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+90-312-000-0000',
      contactType: 'customer service',
      availableLanguage: 'Turkish',
    },
    sameAs: [],
  };
}

// ── WebSite (sitelinks searchbox) ─────────────────────────────────────────────

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MaBridge Global',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/ara?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// ── BreadcrumbList ────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ── Product ───────────────────────────────────────────────────────────────────

export interface ProductForSchema {
  name: string;
  slug: string;
  description?: string;
  brand?: { name: string };
  images?: { url: string; isPrimary: boolean }[];
  variants?: { price: number | string; compareAt?: number | string | null; stockQty: number; sku: string }[];
  reviews?: { rating: number }[];
  _count?: { reviews?: number };
  category: { name: string; slug: string };
}

export function productSchema(product: ProductForSchema) {
  const url = `${SITE_URL}/urun/${product.slug}`;
  const primaryImage =
    product.images?.find((i) => i.isPrimary) ?? product.images?.[0];

  type Variant = NonNullable<ProductForSchema['variants']>[number];
  const lowestVariant = (product.variants ?? []).reduce<Variant | null>(
    (min, v) => (!min || Number(v.price) < Number(min.price) ? v : min),
    null,
  );

  const inStock = (product.variants ?? []).some((v) => v.stockQty > 0);

  const reviewList = product.reviews ?? [];
  const avgRating =
    reviewList.length > 0
      ? reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length
      : null;
  const reviewCount = product._count?.reviews ?? reviewList.length;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url,
    image: primaryImage?.url,
    description: product.description,
    brand: product.brand
      ? { '@type': 'Brand', name: product.brand.name }
      : undefined,
    sku: lowestVariant?.sku,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'TRY',
      price: lowestVariant ? String(lowestVariant.price) : undefined,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'MaBridge Global' },
    },
  };

  if (avgRating !== null && reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating.toFixed(1),
      reviewCount,
      bestRating: '5',
      worstRating: '1',
    };
  }

  return schema;
}
