import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t bg-gray-50 mt-auto">
      <div className="container mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h3 className="font-semibold mb-3">MaBridge</h3>
          <p className="text-muted-foreground">Kaliteli ürünler, güvenli alışveriş.</p>
        </div>
        <div>
          <h3 className="font-semibold mb-3">Kategoriler</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/kategori/elektronik" className="hover:text-foreground">Elektronik</Link></li>
            <li><Link to="/kategori/giyim" className="hover:text-foreground">Giyim</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3">Hesabım</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/hesabim/siparisler" className="hover:text-foreground">Siparişlerim</Link></li>
            <li><Link to="/hesabim/profil" className="hover:text-foreground">Profilim</Link></li>
            <li><Link to="/hesabim/favoriler" className="hover:text-foreground">Favorilerim</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3">Yardım</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/iletisim" className="hover:text-foreground">İletişim</Link></li>
            <li><Link to="/iade" className="hover:text-foreground">İade & Değişim</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © 2026 MaBridge. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
