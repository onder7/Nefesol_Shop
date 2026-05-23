import React, { useEffect, useRef, useState } from 'react';
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

interface ProductFormProps {
  productId?: string;
  onClose: () => void;
  onSaved: () => void;
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductForm({ productId, onClose, onSaved }: ProductFormProps) {
  const isEdit = Boolean(productId);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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

  // Load product if editing
  useEffect(() => {
    if (!productId) return;
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
  }, [productId]);

  // ── Field helpers ──────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: toSlug(name) }));
  }

  // ── Variant helpers ────────────────────────────────────────────────────────

  function setVariant(i: number, patch: Partial<VariantInput>) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[i] = { ...variants[i], ...patch };
      return { ...f, variants };
    });
  }

  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, emptyVariant()] }));
  }

  function removeVariant(i: number) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));
  }

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

  // ── Image helpers ──────────────────────────────────────────────────────────

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
        // İlk görsel ana görsel olsun (eğer hiç ana görsel yoksa)
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
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    uploadFiles(files);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

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
      tags: form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/admin/products/${productId}`, payload);
      } else {
        await api.post('/admin/products', payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt hatası');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-2xl bg-white dark:bg-boxdark shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stroke dark:border-strokedark shrink-0">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            {isEdit ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

            {error && (
              <div className="rounded bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
            )}

            {/* ── Temel Bilgiler ── */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Temel Bilgiler</h3>
              <div className="space-y-4">

                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">Ürün Adı *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className={inputCls}
                    placeholder="Örn: Beyaz Gold Çeyiz Seti"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">Slug *</label>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value)}
                    className={inputCls}
                    placeholder="beyaz-gold-ceyiz-seti"
                  />
                  <p className="text-xs text-gray-400 mt-1">Ad girildiğinde otomatik oluşur, düzenleyebilirsiniz.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-1">Kategori *</label>
                    <select
                      required
                      value={form.categoryId}
                      onChange={(e) => set('categoryId', e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seçiniz...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-1">Marka</label>
                    <select
                      value={form.brandId}
                      onChange={(e) => set('brandId', e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Seçiniz...</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">Açıklama</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    rows={3}
                    className={inputCls}
                    placeholder="Ürün açıklaması..."
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => set('isActive', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary"
                    />
                    <span className="text-sm text-black dark:text-white">Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(e) => set('isFeatured', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary"
                    />
                    <span className="text-sm text-black dark:text-white">Öne Çıkan</span>
                  </label>
                </div>
              </div>
            </section>

            {/* ── Görseller ── */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
                Görseller ({form.images.length})
              </h3>

              {/* Upload zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !uploadingCount && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-4 ${
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
                    <span className="text-sm text-gray-500">{uploadingCount} görsel yükleniyor...</span>
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-10 w-10 text-gray-300 mb-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-sm text-gray-500">Görsel seçmek için tıklayın veya buraya sürükleyin</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, GIF · Maks. 5 MB</p>
                  </>
                )}
              </div>

              {/* Image list */}
              {form.images.length > 0 && (
                <div className="space-y-2">
                  {form.images.map((img, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-stroke dark:border-strokedark">
                      <img
                        src={img.url}
                        alt=""
                        className="h-14 w-14 rounded object-cover shrink-0 bg-gray-100"
                      />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <input
                          value={img.altText}
                          onChange={(e) => setImage(i, { altText: e.target.value })}
                          className={inputSmCls}
                          placeholder="Alt metin (isteğe bağlı)"
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={img.isPrimary}
                            onChange={(e) => setImage(i, { isPrimary: e.target.checked })}
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-xs text-gray-600">Ana görsel</span>
                          {img.isPrimary && (
                            <span className="text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded">
                              ANA
                            </span>
                          )}
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="text-meta-1 hover:text-red-700 text-lg leading-none shrink-0"
                        title="Görseli kaldır"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Varyantlar ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Varyantlar ({form.variants.length})
                </h3>
                <button type="button" onClick={addVariant} className={btnSecondary}>
                  + Varyant Ekle
                </button>
              </div>

              <div className="space-y-4">
                {form.variants.map((v, vi) => (
                  <div key={vi} className="rounded-lg border border-stroke dark:border-strokedark p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Varyant {vi + 1}</span>
                      {form.variants.length > 1 && (
                        <button type="button" onClick={() => removeVariant(vi)}
                          className="text-xs text-meta-1 hover:underline">
                          Kaldır
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">SKU *</label>
                        <input
                          required
                          value={v.sku}
                          onChange={(e) => setVariant(vi, { sku: e.target.value })}
                          className={inputSmCls}
                          placeholder="SKU-001"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Stok Adedi *</label>
                        <input
                          required
                          type="number"
                          min={0}
                          value={v.stockQty}
                          onChange={(e) => setVariant(vi, { stockQty: e.target.value })}
                          className={inputSmCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Fiyat (₺) *</label>
                        <input
                          required
                          type="number"
                          min={0}
                          step="0.01"
                          value={v.price}
                          onChange={(e) => setVariant(vi, { price: e.target.value })}
                          className={inputSmCls}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Karşılaştırma Fiyatı (₺)</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={v.compareAt}
                          onChange={(e) => setVariant(vi, { compareAt: e.target.value })}
                          className={inputSmCls}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Özellikler */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-gray-600">Özellikler</label>
                        <button type="button" onClick={() => addAttr(vi)}
                          className="text-xs text-primary hover:underline">
                          + Özellik Ekle
                        </button>
                      </div>
                      {v.attributes.length === 0 && (
                        <p className="text-xs text-gray-400">Özellik yok (renk, beden vb.)</p>
                      )}
                      {v.attributes.map((attr, ai) => (
                        <div key={ai} className="flex items-center gap-2 mt-1">
                          <input
                            value={attr.key}
                            onChange={(e) => setAttr(vi, ai, { key: e.target.value })}
                            className={`${inputSmCls} w-32`}
                            placeholder="anahtar"
                          />
                          <span className="text-gray-400">:</span>
                          <input
                            value={attr.value}
                            onChange={(e) => setAttr(vi, ai, { value: e.target.value })}
                            className={`${inputSmCls} flex-1`}
                            placeholder="değer"
                          />
                          <button type="button" onClick={() => removeAttr(vi, ai)}
                            className="text-meta-1 hover:text-red-700 text-sm px-1">
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Etiketler ── */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Etiketler</h3>
              <input
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
                className={inputCls}
                placeholder="çeyiz, altın, set (virgülle ayırın)"
              />
            </section>

            {/* ── Footer ── */}
            <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-white dark:bg-boxdark border-t border-stroke dark:border-strokedark flex justify-end gap-3">
              <button type="button" onClick={onClose}
                className="px-5 py-2 rounded border border-stroke text-sm hover:bg-gray-50 dark:hover:bg-meta-4">
                İptal
              </button>
              <button type="submit" disabled={saving || uploadingCount > 0}
                className="px-6 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Ürün Ekle'}
              </button>
            </div>

          </form>
        )}
      </aside>
    </>
  );
}

// ─── Style constants ──────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary';

const inputSmCls =
  'w-full rounded border border-stroke bg-transparent px-2.5 py-1.5 text-xs text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white';

const btnSecondary =
  'px-3 py-1.5 rounded border border-stroke text-xs font-medium hover:bg-gray-50 dark:hover:bg-meta-4 transition';
