import { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Mail, RefreshCw, HelpCircle, Shield, ArrowLeft, Loader2 } from 'lucide-react';

const PAGES = [
  { slug: 'iletisim', label: 'İletişim & Destek', icon: Mail },
  { slug: 'iade', label: 'Kolay İade & Değişim', icon: RefreshCw },
  { slug: 'sss', label: 'Sıkça Sorulan Sorular', icon: HelpCircle },
  { slug: 'sozlesmeler', label: 'Şartlar & Politikalar', icon: Shield },
];

export function SupportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  
  const getSlugFromPath = (path: string) => {
    if (path.startsWith('/iade')) return 'iade';
    if (path.startsWith('/sss')) return 'sss';
    if (path.startsWith('/sozlesmeler')) return 'sozlesmeler';
    return 'iletisim';
  };
  const currentSlug = getSlugFromPath(location.pathname);

  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Contact Form State
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', body: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        name: user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName ?? ''}`.trim() : '',
        email: user.email || '',
      }));
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    setLoading(true);
    setError('');
    setSubmitSuccess(false);
    setSubmitError('');
    api.get<{ success: boolean; data: { slug: string; content: string } }>(`/pages/${currentSlug}`)
      .then((res) => {
        if (res.data?.success) {
          setContent(res.data.data.content);
        } else {
          setError('Sayfa içeriği yüklenemedi.');
        }
      })
      .catch((err) => {
        console.error('Failed to load page content:', err);
        setError('Sayfa yüklenirken bir ağ hatası oluştu.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.body) {
      setSubmitError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);
    try {
      const res = await api.post<{ success: boolean }>('/contact', formData);
      if (res.data?.success) {
        setSubmitSuccess(true);
        setFormData(prev => ({ ...prev, subject: '', body: '' })); // clear message inputs, keep name/email
      } else {
        setSubmitError('Mesajınız gönderilemedi. Lütfen daha sonra tekrar deneyin.');
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  const activePage = PAGES.find(p => p.slug === currentSlug) || PAGES[0];

  return (
    <main className="bg-neutral-50/50 min-h-[calc(100vh-160px)] pb-16 pt-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb / Back button */}
        <div className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
            <span>Ana Sayfa</span>
          </button>
          <span>/</span>
          <span className="text-neutral-800 font-medium">{activePage.label}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Nav */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-xs sticky top-24">
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-3 mb-4">
                Müşteri Hizmetleri
              </h2>
              <nav className="space-y-1">
                {PAGES.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.slug === currentSlug;
                  return (
                    <Link
                      key={item.slug}
                      to={item.slug === 'sozlesmeler' ? '/sozlesmeler' : item.slug === 'sss' ? '/sss' : item.slug === 'iade' ? '/iade' : '/iletisim'}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition ${
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-neutral-400'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Page Content Card */}
          <section className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-neutral-100 p-6 md:p-10 shadow-xs">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Yükleniyor...</p>
                </div>
              ) : error ? (
                <div className="py-16 text-center">
                  <p className="text-red-500 font-medium">{error}</p>
                  <button
                    onClick={() => setContent('')} // triggers reload via effect dependency if changed
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-opacity-90 transition"
                  >
                    Tekrar Dene
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Rich HTML Content from Database */}
                  <div 
                    className="prose max-w-none text-neutral-700 leading-relaxed font-sans"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />

                  {/* Interactive form only on iletisim page */}
                  {currentSlug === 'iletisim' && (
                    <div className="mt-8 border-t border-neutral-100 pt-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Form */}
                        <div>
                          <h3 className="text-lg font-bold text-neutral-800 mb-4">Bizimle İletişime Geçin</h3>
                          <form onSubmit={handleSubmit} className="space-y-4">
                            {submitSuccess && (
                              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                                Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.
                              </div>
                            )}
                            {submitError && (
                              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                                {submitError}
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                                Ad Soyad *
                              </label>
                              <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                                placeholder="Adınız Soyadınız"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                                E-posta *
                              </label>
                              <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                                placeholder="ornek@mail.com"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                                Konu
                              </label>
                              <input
                                type="text"
                                value={formData.subject}
                                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                                placeholder="Mesaj konusu"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                                Mesajınız *
                              </label>
                              <textarea
                                required
                                rows={4}
                                value={formData.body}
                                onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                                placeholder="Sorunuzu veya mesajınızı buraya yazın..."
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={submitting}
                              className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-opacity-95 disabled:opacity-50 transition cursor-pointer text-sm shadow-xs flex items-center justify-center gap-2"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Gönderiliyor...</span>
                                </>
                              ) : (
                                <span>Mesajı Gönder</span>
                              )}
                            </button>
                          </form>
                        </div>

                        {/* Map and Address */}
                        <div className="flex flex-col gap-6">
                          <div>
                            <h3 className="text-lg font-bold text-neutral-800 mb-4">Merkez Ofisimiz</h3>
                            <p className="text-sm text-neutral-600 mb-4 font-sans leading-relaxed">
                              Ziyaret etmek veya soru sormak isterseniz, merkez ofisimiz Ankara şehir merkezinde yer almaktadır.
                            </p>
                          </div>
                          <div className="flex-1 min-h-[280px]">
                            <iframe
                              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d195884.30030588698!2d32.62267988358488!3d39.90329181165241!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14d347d520730525%3A0xb89a3c7db2bc3397!2sAnkara!5e0!3m2!1str!2str!4v1700000000000!5m2!1str!2str"
                              width="100%"
                              height="100%"
                              style={{ border: 0, minHeight: '280px' }}
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              className="rounded-2xl border border-neutral-100 shadow-xs"
                            ></iframe>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

