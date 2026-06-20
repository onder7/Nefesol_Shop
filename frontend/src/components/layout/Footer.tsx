import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/services/productApi';
import { api } from '@/services/api';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useState } from 'react';
import { useSocialLinks } from '@/hooks/useSocialLinks';
import { useStoreInfo } from '@/hooks/useStoreInfo';

const FacebookIcon = () => (
  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
  </svg>
);

const InstagramIcon = () => (
  <svg className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const LinkedinIcon = () => (
  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

const TwitterIcon = () => (
  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
  </svg>
);

const YoutubeIcon = () => (
  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
    <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const TiktokIcon = () => (
  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="h-4 w-4 fill-current" viewBox="0 0 32 32">
    <path d="M16.003 3C9.375 3 4 8.373 4 15.001c0 2.118.553 4.107 1.518 5.837L4 29l8.38-1.495A12.94 12.94 0 0016.003 28c6.628 0 12.003-5.373 12.003-12.001S22.631 3 16.003 3zm0 21.999a10.92 10.92 0 01-5.582-1.531l-.4-.237-4.147.74.763-4.02-.26-.416A10.955 10.955 0 015.002 15c0-6.075 4.926-11 10.999-11C22.074 4 27 8.925 27 15s-4.926 11-10.997 11zm5.97-8.225c-.327-.163-1.935-.955-2.234-1.065-.3-.109-.517-.163-.735.163-.218.328-.844 1.065-.935 1.065-.163 0-.327-.054-.49-.163-.327-.163-1.38-.508-2.625-1.62-.97-.866-1.625-1.937-1.815-2.265-.19-.327-.02-.503.144-.666.147-.147.327-.382.49-.572.164-.19.219-.327.328-.545.109-.218.054-.41-.027-.572-.082-.163-.735-1.774-1.008-2.427-.264-.635-.537-.545-.735-.556h-.626c-.218 0-.572.082-.872.41-.3.327-1.143 1.118-1.143 2.727s1.17 3.162 1.333 3.38c.163.218 2.302 3.514 5.58 4.93.78.336 1.388.536 1.863.687.783.25 1.496.214 2.059.13.628-.094 1.935-.79 2.208-1.554.273-.763.273-1.417.19-1.554-.08-.136-.3-.218-.626-.382z" />
  </svg>
);

interface SocialLinkProps {
  href: string;
  children: React.ReactNode;
}

function SocialBtn({ href, children }: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="p-2 bg-neutral-900 hover:bg-primary hover:text-white rounded-full transition-all text-neutral-400"
    >
      {children}
    </a>
  );
}

export function Footer() {
  const { name: storeName, slogan: storeSlogan } = useStoreInfo();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.categories(),
  });
  const categories = categoriesData?.data?.data?.slice(0, 5) ?? [];

  const { data: socialLinks } = useSocialLinks();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/newsletter/subscribe', { email });
      if (res.data.success) {
        toast.success(res.data.message || 'Bültenimize başarıyla abone oldunuz!');
        setEmail('');
      } else {
        toast.error(res.data.message || 'Abonelik sırasında bir hata oluştu.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasSocialLinks =
    socialLinks &&
    Object.values(socialLinks).some((v) => v && v.trim() !== '');

  return (
    <footer className="bg-neutral-950 text-neutral-200 mt-auto border-t border-neutral-800 pb-20 lg:pb-0">
      {/* Newsletter Section */}
      <div className="border-b border-neutral-800 py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="max-w-xl">
            <h3 className="text-xl font-bold text-white mb-2">Özel Fırsatlardan Haberdar Olun!</h3>
            <p className="text-neutral-400 text-sm">
              Bültenimize abone olun, yeni ürünlerden, kampanyalardan ve size özel sürpriz indirimlerden ilk siz haberdar olun.
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="flex w-full md:w-auto max-w-md items-center gap-2">
            <Input
              type="email"
              placeholder="E-posta adresiniz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus-visible:ring-primary h-10 w-full md:w-80"
              required
              disabled={submitting}
            />
            <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/95 text-white font-medium px-4 h-10 gap-2 shrink-0 border-none">
              <span>{submitting ? 'Abone Yapılıyor...' : 'Abone Ol'}</span>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Main Links Section */}
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h3 className="text-lg font-bold text-white mb-4">{storeName}</h3>
          <p className="text-neutral-400 mb-6 leading-relaxed">
            {storeSlogan || 'Güvenli ödeme ve hızlı kargo seçenekleriyle binlerce ürünü keşfedin.'}
          </p>

          {/* Sosyal medya iconları — sadece admin panelinde girilmişse görünür */}
          {hasSocialLinks && (
            <div className="flex items-center flex-wrap gap-3">
              {socialLinks.whatsapp && (
                <SocialBtn href={`https://wa.me/${socialLinks.whatsapp.replace(/\D/g, '')}`}>
                  <WhatsAppIcon />
                </SocialBtn>
              )}
              {socialLinks.instagram && (
                <SocialBtn href={socialLinks.instagram}>
                  <InstagramIcon />
                </SocialBtn>
              )}
              {socialLinks.facebook && (
                <SocialBtn href={socialLinks.facebook}>
                  <FacebookIcon />
                </SocialBtn>
              )}
              {socialLinks.twitter && (
                <SocialBtn href={socialLinks.twitter}>
                  <TwitterIcon />
                </SocialBtn>
              )}
              {socialLinks.youtube && (
                <SocialBtn href={socialLinks.youtube}>
                  <YoutubeIcon />
                </SocialBtn>
              )}
              {socialLinks.linkedin && (
                <SocialBtn href={socialLinks.linkedin}>
                  <LinkedinIcon />
                </SocialBtn>
              )}
              {socialLinks.tiktok && (
                <SocialBtn href={socialLinks.tiktok}>
                  <TiktokIcon />
                </SocialBtn>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-white mb-4 tracking-wider">Kategoriler</h3>
          <ul className="space-y-3 text-neutral-400">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link to={`/kategori/${cat.slug}`} className="hover:text-white hover:underline transition-colors">
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-white mb-4 tracking-wider">Hesabım</h3>
          <ul className="space-y-3 text-neutral-400">
            <li><Link to="/hesabim/siparisler" className="hover:text-white hover:underline transition-colors">Siparişlerim</Link></li>
            <li><Link to="/hesabim/profil" className="hover:text-white hover:underline transition-colors">Profil Bilgilerim</Link></li>
            <li><Link to="/sepet" className="hover:text-white hover:underline transition-colors">Sepetim</Link></li>
            <li><Link to="/hesabim/favoriler" className="hover:text-white hover:underline transition-colors">Favori Ürünlerim</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-white mb-4 tracking-wider">Müşteri Hizmetleri</h3>
          <ul className="space-y-3 text-neutral-400">
            <li><Link to="/iletisim" className="hover:text-white hover:underline transition-colors">İletişim & Destek</Link></li>
            <li><Link to="/iade" className="hover:text-white hover:underline transition-colors">Kolay İade & Değişim</Link></li>
            <li><Link to="/sss" className="hover:text-white hover:underline transition-colors">Sıkça Sorulan Sorular</Link></li>
            <li><Link to="/sozlesmeler" className="hover:text-white hover:underline transition-colors">Şartlar & Politikalar</Link></li>
            <li><Link to="/hakkimizda" className="hover:text-white hover:underline transition-colors">Hakkımızda</Link></li>
            <li><Link to="/kvkk" className="hover:text-white hover:underline transition-colors">KVKK Sözleşmesi</Link></li>
            <li><Link to="/uyelik" className="hover:text-white hover:underline transition-colors">Üyelik Sözleşmesi</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-neutral-900 bg-neutral-950/50 py-6 text-center text-xs text-neutral-500">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} {storeName}. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
}
