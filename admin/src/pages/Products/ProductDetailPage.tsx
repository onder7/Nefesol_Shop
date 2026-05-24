import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category { id: string; name: string }
interface Brand    { id: string; name: string }
interface AttrPair { key: string; value: string }

interface VariantInput {
  id?: string;
  sku: string;
  price: string;
  compareAt: string;
  stockQty: string;
  attributes: AttrPair[];
}

interface ImageInput {
  url: string;
  altText: string;
  isPrimary: boolean;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  brandId: string;
  isActive: boolean;
  isFeatured: boolean;
  variants: VariantInput[];
  images: ImageInput[];
  tags: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(s: string) {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fmtPrice(n: string | number) {
  return Number(n).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

const emptyVariant = (): VariantInput => ({
  sku: '', price: '', compareAt: '', stockQty: '0', attributes: [],
});

const defaultForm = (): FormState => ({
  name: '', slug: '', description: '',
  categoryId: '', brandId: '',
  isActive: true, isFeatured: false,
  variants: [emptyVariant()],
  images: [],
  tags: '',
});

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Card({ title, children, action, className = '' }: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark ${className}`}>
      <div className="px-5 py-3.5 border-b border-stroke dark:border-strokedark flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary';

const inputSmCls =
  'w-full rounded border border-stroke bg-transparent px-2.5 py-1.5 text-xs text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const { id: productId } = useParams<{ id: string }>();
  const isNew = !productId || productId === 'new';
  const navigate = useNavigate();

  const [form, setForm]             = useState<FormState>(defaultForm());
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands]         = useState<Brand[]>([]);
  const [loading, setLoading]       = useState(!isNew);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError]           = useState('');
  const [savedOk, setSavedOk]       = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load categories & brands
  useEffect(() => {
    Promise.all([
      api.get<{ success: boolean; data: Category[] }>('/admin/categories'),
      api.get<{ success: boolean; data: Brand[] }>('/admin/brands'),
    ]).then(([c, b]) => {
      setCategories(c.data ?? []);
      setBrands(b.data ?? []);
    });
  }, []);

  // Load product for edit
  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    api.get<{ success: boolean; data: any }>(`/admin/products/${productId}`)
      .then((r) => {
        const p = r.data;
        setForm({
          name: p.name,
          slug: p.slug,
          description: p.description ?? '',
          categoryId: p.categoryId,
          brandId: p.brandId ?? '',
          isActive: p.isActive,
          isFeatured: p.isFeatured,
          variants: p.variants.map((v: any) => ({
            id: v.id,
            sku: v.sku,
            price: String(v.price),
            compareAt: v.compareAt ? String(v.compareAt) : '',
            stockQty: String(v.stockQty),
            attributes: Object.entries((v.attributes as Record<string, string>) ?? {}).map(
              ([key, value]) => ({ key, value })
            ),
          })),
          images: p.images.map((img: any) => ({
            url: img.url,
            altText: img.altText ?? '',
            isPrimary: img.isPrimary,
          })),
          tags: p.tags.map((t: any) => t.tag).join(', '),
        });
      })
      .catch(() => setError('Ürün yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [productId, isNew]);

  // ── Form helpers ─────────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: toSlug(name) }));
  }

  // ── Variant helpers ───────────────────────────────────────────────────────────

  function setVariant(i: number, patch: Partial<VariantInput>) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[i] = { ...variants[i], ...patch };
      return { ...f, variants };
    });
  }

  function addVariant() { setForm((f) => ({ ...f, variants: [...f.variants, emptyVariant()] })); }
  function removeVariant(i: number) { setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) })); }

  function addAttr(vi: number) {
    setVariant(vi, { attributes: [...form.variants[vi].attributes, { key: '', value: '' }] });
  }

  function setAttr(vi: number, ai: number, patch: Partial<AttrPair>) {
    setForm((f) => {
      const variants = [...f.variants];
      const attributes = [...variants[vi].attributes];
      attributes[ai] = { ...attributes[ai], ...patch };
      variants[vi] = { ...variants[vi], attributes };
      return { ...f, variants };
    });
  }

  function removeAttr(vi: number, ai: number) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[vi] = { ...variants[vi], attributes: variants[vi].attributes.filter((_, i) => i !== ai) };
      return { ...f, variants };
    });
  }

  // ── Image helpers ─────────────────────────────────────────────────────────────

  function setImage(i: number, patch: Partial<ImageInput>) {
    setForm((f) => {
      const images = [...f.images];
      if (patch.isPrimary) images.forEach((_, idx) => { images[idx] = { ...images[idx], isPrimary: false }; });
      images[i] = { ...images[i], ...patch };
      return { ...f, images };
    });
  }

  function removeImage(i: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  }

  async function uploadFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    setUploadingCount(imageFiles.length);
    setError('');
    const results = await Promise.allSettled(
      imageFiles.map((file) =>
        api.upload<{ success: boolean; data: { url: string } }>('/admin/upload', file)
      )
    );
    const succeeded: ImageInput[] = results
      .filter((r): r is PromiseFulfilledResult<{ success: boolean; data: { url: string } }> => r.status === 'fulfilled')
      .map((r) => ({ url: r.value.data.url, altText: '', isPrimary: false }));
    if (succeeded.length) {
      setForm((f) => {
        const images = [...f.images, ...succeeded];
        if (!images.some((img) => img.isPrimary) && images.length > 0) {
          images[0] = { ...images[0], isPrimary: true };
        }
        return { ...f, images };
      });
    }
    setUploadingCount(0);
    const failCount = results.filter((r) => r.status === 'rejected').length;
    if (failCount > 0) setError(`${failCount} görsel yüklenemedi.`);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    uploadFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.categoryId) { setError('Kategori seçiniz.'); return; }
    if (form.variants.some((v) => !v.sku || !v.price)) {
      setError('Her varyant için SKU ve fiyat zorunludur.');
      return;
    }
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      categoryId: form.categoryId,
      brandId: form.brandId || undefined,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      variants: form.variants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        sku: v.sku,
        price: Number(v.price),
        compareAt: v.compareAt ? Number(v.compareAt) : undefined,
        stockQty: Number(v.stockQty),
        attributes: Object.fromEntries(v.attributes.filter((a) => a.key).map((a) => [a.key, a.value])),
      })),
      images: form.images.map((img, i) => ({
        url: img.url,
        altText: img.altText || undefined,
        isPrimary: img.isPrimary,
        sortOrder: i,
      })),
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    };
    setSaving(true);
    try {
      if (isNew) {
        const r = await api.post<{ success: boolean; data: { id: string } }>('/admin/products', payload);
        navigate(`/products/${r.data.id}`, { replace: true });
      } else {
        await api.put(`/admin/products/${productId}`, payload);
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt hatası');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/admin/products/${productId}`);
      navigate('/products', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silme hatası');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-10 w-10 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const primaryImage = form.images.find((img) => img.isPrimary) ?? form.images[0];
  const categoryName = categories.find((c) => c.id === form.categoryId)?.name;
  const brandName    = brands.find((b) => b.id === form.brandId)?.name;

  return (
    <form onSubmit={handleSubmit}>

      {/* ── Top Bar ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
            <Link to="/products" className="hover:text-primary transition-colors">Ürünler</Link>
            <span>/</span>
            <span className="text-black dark:text-white font-medium">
              {isNew ? 'Yeni Ürün' : form.name || '...'}
            </span>
          </nav>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            {isNew ? 'Yeni Ürün Ekle' : 'Ürün Düzenle'}
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {savedOk && (
            <span className="text-sm text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
              Kaydedildi ✓
            </span>
          )}

          {!isNew && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm font-medium hover:bg-red-100 transition"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sil
            </button>
          )}

          {confirmDelete && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <span className="text-sm text-red-700">Emin misiniz?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded disabled:opacity-50"
              >
                {deleting ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 px-2 py-1">
                Vazgeç
              </button>
            </div>
          )}

          <Link
            to="/products"
            className="px-4 py-2 rounded-lg border border-stroke bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4 transition"
          >
            ← Listeye Dön
          </Link>

          <button
            type="submit"
            disabled={saving || uploadingCount > 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition"
          >
            {saving ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Kaydediliyor...
              </>
            ) : (
              isNew ? '+ Ürün Ekle' : 'Değişiklikleri Kaydet'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ─── Left Column ─── */}
        <div className="flex flex-col gap-5">

          {/* Kart 1: Ürün Önizleme */}
          {!isNew && (
            <Card title="Ürün Özeti">
              <div className="flex gap-4 items-start">
                <div className="h-20 w-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                  {primaryImage ? (
                    <img src={primaryImage.url} alt={form.name} className="h-full w-full object-cover" />
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="#d1d5db" strokeWidth="1.5"/>
                      <path d="M3 15l5-5 4 4 3-3 6 6" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-black dark:text-white text-sm line-clamp-2">{form.name || '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">/{form.slug}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {categoryName && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{categoryName}</span>
                    )}
                    {brandName && (
                      <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{brandName}</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${form.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {form.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                    {form.isFeatured && (
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">★ Öne Çıkan</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Kart 2: Temel Bilgiler */}
          <Card title="Temel Bilgiler">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ürün Adı *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={inputCls}
                  placeholder="Örn: Beyaz Gold Çeyiz Seti"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Slug *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">/</span>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value)}
                    className={inputCls + ' pl-6'}
                    placeholder="beyaz-gold-ceyiz-seti"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Kategori *</label>
                <select
                  required
                  value={form.categoryId}
                  onChange={(e) => set('categoryId', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seçiniz...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Marka</label>
                <select
                  value={form.brandId}
                  onChange={(e) => set('brandId', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seçiniz...</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Açıklama</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={4}
                  className={inputCls}
                  placeholder="Ürün açıklaması..."
                />
              </div>

              {/* Toggle switches */}
              <div className="flex flex-col gap-3 pt-1">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">Aktif</p>
                    <p className="text-xs text-gray-400">Müşteriler bu ürünü görebilir</p>
                  </div>
                  <div
                    onClick={() => set('isActive', !form.isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${form.isActive ? 'bg-primary' : 'bg-gray-200 dark:bg-strokedark'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">Öne Çıkan</p>
                    <p className="text-xs text-gray-400">Ana sayfada gösterilir</p>
                  </div>
                  <div
                    onClick={() => set('isFeatured', !form.isFeatured)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${form.isFeatured ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-strokedark'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isFeatured ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>
              </div>
            </div>
          </Card>

          {/* Kart 3: Etiketler */}
          <Card title="Etiketler">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Virgülle ayırarak girin
            </label>
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              className={inputCls}
              placeholder="çeyiz, altın, set"
            />
            {form.tags && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {form.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 dark:bg-meta-4 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ─── Right Column (2/3) ─── */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Kart 4: Görseller */}
          <Card
            title={`Görseller${form.images.length > 0 ? ` (${form.images.length})` : ''}`}
          >
            {/* Upload zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !uploadingCount && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors mb-4 ${
                isDragging
                  ? 'border-primary bg-primary/5 cursor-copy'
                  : uploadingCount
                  ? 'border-stroke cursor-not-allowed'
                  : 'border-stroke dark:border-strokedark hover:border-primary cursor-pointer'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileInput}
              />
              {uploadingCount > 0 ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm text-gray-500">{uploadingCount} görsel yükleniyor…</span>
                </div>
              ) : (
                <>
                  <svg className="mx-auto mb-2 text-gray-300" width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-sm text-gray-500">Görseli sürükle veya tıkla</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · Maks. 5 MB</p>
                </>
              )}
            </div>

            {/* Image grid */}
            {form.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {form.images.map((img, i) => (
                  <div key={i} className={`relative rounded-xl overflow-hidden border-2 transition-colors group ${img.isPrimary ? 'border-primary' : 'border-stroke dark:border-strokedark hover:border-gray-300'}`}>
                    <img src={img.url} alt={img.altText || ''} className="w-full aspect-square object-cover" />
                    {img.isPrimary && (
                      <span className="absolute top-1.5 left-1.5 text-[10px] bg-primary text-white font-semibold px-1.5 py-0.5 rounded-md">
                        Ana
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      {!img.isPrimary && (
                        <button
                          type="button"
                          onClick={() => setImage(i, { isPrimary: true })}
                          title="Ana görsel yap"
                          className="bg-white text-xs text-gray-700 px-2 py-1 rounded-lg font-medium hover:bg-primary hover:text-white transition"
                        >
                          Ana
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        title="Kaldır"
                        className="bg-white text-red-600 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-600 hover:text-white transition"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Kart 5: Varyantlar */}
          <Card
            title={`Varyantlar (${form.variants.length})`}
            action={
              <button
                type="button"
                onClick={addVariant}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                Varyant Ekle
              </button>
            }
          >
            <div className="space-y-4">
              {form.variants.map((v, vi) => (
                <div key={vi} className="rounded-xl border border-stroke dark:border-strokedark overflow-hidden">
                  {/* Variant header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-meta-4">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Varyant {vi + 1}
                      {v.sku && <span className="ml-2 font-mono text-primary normal-case">{v.sku}</span>}
                    </span>
                    <div className="flex items-center gap-3">
                      {v.price && (
                        <span className="text-xs font-medium text-black dark:text-white">{fmtPrice(v.price)}</span>
                      )}
                      {form.variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVariant(vi)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Kaldır
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Variant fields */}
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">SKU *</label>
                        <input
                          required
                          value={v.sku}
                          onChange={(e) => setVariant(vi, { sku: e.target.value })}
                          className={inputSmCls}
                          placeholder="SKU-001"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Stok</label>
                        <input
                          required type="number" min={0}
                          value={v.stockQty}
                          onChange={(e) => setVariant(vi, { stockQty: e.target.value })}
                          className={inputSmCls}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Fiyat (₺) *</label>
                        <input
                          required type="number" min={0} step="0.01"
                          value={v.price}
                          onChange={(e) => setVariant(vi, { price: e.target.value })}
                          className={inputSmCls}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Karş. Fiyat (₺)</label>
                        <input
                          type="number" min={0} step="0.01"
                          value={v.compareAt}
                          onChange={(e) => setVariant(vi, { compareAt: e.target.value })}
                          className={inputSmCls}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Attributes */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Özellikler</span>
                        <button type="button" onClick={() => addAttr(vi)} className="text-xs text-primary hover:underline">
                          + Ekle
                        </button>
                      </div>
                      {v.attributes.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Henüz özellik yok (renk, beden vb.)</p>
                      ) : (
                        <div className="space-y-1.5">
                          {v.attributes.map((attr, ai) => (
                            <div key={ai} className="flex items-center gap-2">
                              <input
                                value={attr.key}
                                onChange={(e) => setAttr(vi, ai, { key: e.target.value })}
                                className={`${inputSmCls} w-28`}
                                placeholder="anahtar"
                              />
                              <span className="text-gray-400 text-xs">:</span>
                              <input
                                value={attr.value}
                                onChange={(e) => setAttr(vi, ai, { value: e.target.value })}
                                className={`${inputSmCls} flex-1`}
                                placeholder="değer"
                              />
                              <button type="button" onClick={() => removeAttr(vi, ai)}
                                className="text-red-400 hover:text-red-600 text-sm px-1">
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Sticky Save Bar (mobile) ── */}
      <div className="sticky bottom-0 mt-6 -mx-6 px-6 py-3 bg-white dark:bg-boxdark border-t border-stroke dark:border-strokedark flex justify-end gap-3 lg:hidden">
        <Link to="/products" className="px-4 py-2 rounded-lg border border-stroke text-sm text-gray-700 hover:bg-gray-50">
          İptal
        </Link>
        <button
          type="submit"
          disabled={saving || uploadingCount > 0}
          className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : isNew ? 'Ürün Ekle' : 'Kaydet'}
        </button>
      </div>

    </form>
  );
}
