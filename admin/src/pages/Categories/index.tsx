import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  showInMenu: boolean;
  sortOrder: number;
  parentId?: string;
  imageUrl?: string;
  parent?: { name: string };
  children: { id: string; name: string; slug: string }[];
  _count: { products: number };
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
  showInMenu: boolean;
  parentId: string;
}

function toSlug(s: string) {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const defaultForm = (): FormState => ({
  name: '', slug: '', description: '', sortOrder: '0', isActive: true, showInMenu: true, parentId: '',
});

const inputCls = 'w-full rounded border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; data: Category[] }>('/admin/categories')
      .then((r) => setCategories(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditingId(undefined);
    setForm(defaultForm());
    setError('');
    setFormOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? '',
      sortOrder: String(cat.sortOrder),
      isActive: cat.isActive,
      showInMenu: cat.showInMenu,
      parentId: cat.parentId ?? '',
    });
    setError('');
    setFormOpen(true);
  }

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: editingId ? f.slug : toSlug(name) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
      showInMenu: form.showInMenu,
      parentId: form.parentId || undefined,
    };
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/categories/${editingId}`, payload);
      } else {
        await api.post('/admin/categories', payload);
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt hatası');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await api.delete(`/admin/categories/${id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silme hatası');
    } finally {
      setDeleting(null);
    }
  }

  const topLevel = categories.filter((c) => !c.parentId);

  return (
    <div>
      {/* Silme onay modalı */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-boxdark rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Kategoriyi Sil</h3>
            <p className="text-sm text-gray-500 mb-5">Bu kategoriyi silmek istediğinizden emin misiniz?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded border border-stroke text-sm hover:bg-gray-50">İptal</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting === deleteConfirm}
                className="px-4 py-2 rounded bg-meta-1 text-white text-sm hover:bg-opacity-90 disabled:opacity-50">
                {deleting === deleteConfirm ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form drawer */}
      {formOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setFormOpen(false)} />
          <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white dark:bg-boxdark shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke dark:border-strokedark shrink-0">
              <h2 className="text-lg font-semibold text-black dark:text-white">
                {editingId ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
              </h2>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {error && (
                <div className="rounded bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Kategori Adı *</label>
                <input required value={form.name} onChange={(e) => handleNameChange(e.target.value)}
                  className={inputCls} placeholder="Örn: Nevresim Takımları" />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Slug *</label>
                <input required value={form.slug} onChange={(e) => set('slug', e.target.value)}
                  className={inputCls} placeholder="nevresim-takimlari" />
                <p className="text-xs text-gray-400 mt-1">URL'de kullanılır. Otomatik oluşur, düzenleyebilirsiniz.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">Açıklama</label>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                  rows={3} className={inputCls} placeholder="Kategori açıklaması..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">Üst Kategori</label>
                  <select value={form.parentId} onChange={(e) => set('parentId', e.target.value)} className={inputCls}>
                    <option value="">Ana Kategori</option>
                    {categories
                      .filter((c) => c.id !== editingId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-1">Sıra</label>
                  <input type="number" min={0} value={form.sortOrder}
                    onChange={(e) => set('sortOrder', e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive}
                    onChange={(e) => set('isActive', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary" />
                  <span className="text-sm text-black dark:text-white">Aktif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.showInMenu}
                    onChange={(e) => set('showInMenu', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary" />
                  <span className="text-sm text-black dark:text-white">Menüde Göster</span>
                </label>
              </div>

              <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-white dark:bg-boxdark border-t border-stroke dark:border-strokedark flex justify-end gap-3">
                <button type="button" onClick={() => setFormOpen(false)}
                  className="px-5 py-2 rounded border border-stroke text-sm hover:bg-gray-50 dark:hover:bg-meta-4">
                  İptal
                </button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-opacity-90 disabled:opacity-50">
                  {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </aside>
        </>
      )}

      {/* Başlık */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">Kategori Yönetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">{categories.length} kategori</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 transition">
          <span className="text-lg leading-none">+</span>
          Yeni Kategori
        </button>
      </div>

      {/* Tablo */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark bg-gray-2 dark:bg-meta-4">
                  <th className="px-5 py-4 text-left font-medium text-gray-600">Kategori</th>
                  <th className="px-5 py-4 text-left font-medium text-gray-600">Üst Kategori</th>
                  <th className="px-5 py-4 text-center font-medium text-gray-600">Ürün</th>
                  <th className="px-5 py-4 text-center font-medium text-gray-600">Alt Kategori</th>
                  <th className="px-5 py-4 text-center font-medium text-gray-600">Sıra</th>
                  <th className="px-5 py-4 text-left font-medium text-gray-600">Durum</th>
                  <th className="px-5 py-4 text-center font-medium text-gray-600">Menüde</th>
                  <th className="px-5 py-4 text-left font-medium text-gray-600">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}
                    className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30">
                    <td className="px-5 py-4">
                      <div className="font-medium text-black dark:text-white">{cat.name}</div>
                      <div className="text-xs text-gray-400">/{cat.slug}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {cat.parent?.name ?? <span className="text-gray-400 italic">Ana Kategori</span>}
                    </td>
                    <td className="px-5 py-4 text-center font-medium">{cat._count.products}</td>
                    <td className="px-5 py-4 text-center">{cat.children.length}</td>
                    <td className="px-5 py-4 text-center text-gray-600">{cat.sortOrder}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {cat.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.showInMenu ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {cat.showInMenu ? 'Evet' : 'Hayır'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(cat)}
                          className="px-3 py-1 rounded bg-blue-50 text-blue-700 text-xs hover:bg-blue-100 transition">
                          Düzenle
                        </button>
                        <button onClick={() => setDeleteConfirm(cat.id)}
                          className="px-3 py-1 rounded bg-red-50 text-meta-1 text-xs hover:bg-red-100 transition">
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">Kategori bulunamadı.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
