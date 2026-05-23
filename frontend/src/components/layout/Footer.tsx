import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/services/productApi';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useState } from 'react';

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

export function Footer() {
  const [email, setEmail] = useState('');
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.categories(),
  });
  const categories = categoriesData?.data?.data?.slice(0, 5) ?? [];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success('Bültenimize başarıyla abone oldunuz!');
    setEmail('');
  };

  return (
    <footer className="bg-neutral-950 text-neutral-200 mt-auto border-t border-neutral-800">
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
            />
            <Button type="submit" className="bg-primary hover:bg-primary/95 text-white font-medium px-4 h-10 gap-2 shrink-0 border-none">
              <span>Abone Ol</span>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Main Links Section */}
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h3 className="text-lg font-bold text-white mb-4">MaBridge</h3>
          <p className="text-neutral-400 mb-6 leading-relaxed">
            Çeyiz ve ev tekstilinin en kaliteli adresinde, güvenli ödeme ve hızlı kargo seçenekleriyle binlerce ürünü keşfedin.
          </p>
          <div className="flex items-center gap-3">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="p-2 bg-neutral-900 hover:bg-primary hover:text-white rounded-full transition-all text-neutral-400">
              <FacebookIcon />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="p-2 bg-neutral-900 hover:bg-primary hover:text-white rounded-full transition-all text-neutral-400">
              <InstagramIcon />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="p-2 bg-neutral-900 hover:bg-primary hover:text-white rounded-full transition-all text-neutral-400">
              <LinkedinIcon />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="p-2 bg-neutral-900 hover:bg-primary hover:text-white rounded-full transition-all text-neutral-400">
              <TwitterIcon />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="p-2 bg-neutral-900 hover:bg-primary hover:text-white rounded-full transition-all text-neutral-400">
              <YoutubeIcon />
            </a>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-white mb-4 tracking-wider">Kategoriler</h3>
          <ul className="space-y-3 text-neutral-400">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link to={`/kategori/${cat.slug}`} className="hover:text-primary hover:underline transition-all">
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-white mb-4 tracking-wider">Hesabım</h3>
          <ul className="space-y-3 text-neutral-400">
            <li><Link to="/hesabim/siparisler" className="hover:text-primary hover:underline transition-all">Siparişlerim</Link></li>
            <li><Link to="/hesabim/profil" className="hover:text-primary hover:underline transition-all">Profil Bilgilerim</Link></li>
            <li><Link to="/sepet" className="hover:text-primary hover:underline transition-all">Sepetim</Link></li>
            <li><Link to="/hesabim/favoriler" className="hover:text-primary hover:underline transition-all">Favori Ürünlerim</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-white mb-4 tracking-wider">Müşteri Hizmetleri</h3>
          <ul className="space-y-3 text-neutral-400">
            <li><Link to="/iletisim" className="hover:text-primary hover:underline transition-all">İletişim & Destek</Link></li>
            <li><Link to="/iade" className="hover:text-primary hover:underline transition-all">Kolay İade & Değişim</Link></li>
            <li><Link to="/sss" className="hover:text-primary hover:underline transition-all">Sıkça Sorulan Sorular</Link></li>
            <li><Link to="/sozlesmeler" className="hover:text-primary hover:underline transition-all">Şartlar & Politikalar</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-neutral-900 bg-neutral-950/50 py-6 text-center text-xs text-neutral-500">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} MaBridge. Tüm hakları saklıdır.</p>
          <p className="flex items-center gap-1">
            <span>Powered by</span>
            <span className="font-semibold text-neutral-400">MaBridge Tech</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
