export function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Alışverişin En İyi Hali</h1>
          <p className="text-muted-foreground text-lg mb-8">Binlerce ürün, güvenli ödeme, hızlı teslimat.</p>
          <a href="/ara" className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Alışverişe Başla
          </a>
        </div>
      </section>

      {/* Kategoriler */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">Kategoriler</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Elektronik', slug: 'elektronik', emoji: '📱' },
            { name: 'Giyim', slug: 'giyim', emoji: '👕' },
            { name: 'Telefon', slug: 'telefon', emoji: '☎️' },
            { name: 'Laptop', slug: 'laptop', emoji: '💻' },
          ].map((cat) => (
            <a
              key={cat.slug}
              href={`/kategori/${cat.slug}`}
              className="border rounded-xl p-6 text-center hover:border-primary hover:shadow-sm transition-all"
            >
              <span className="text-4xl">{cat.emoji}</span>
              <p className="mt-2 font-medium">{cat.name}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Öne Çıkan Ürünler — API'den gelecek */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">Öne Çıkan Ürünler</h2>
        <p className="text-muted-foreground">Ürünler yükleniyor... (API bağlantısı Aşama 4'te eklenecek)</p>
      </section>
    </main>
  );
}
