// Umami izleme script'ini backend'deki ayara göre dinamik yükler.
// Ayar, admin panelinde Sistem Ayarları → Analytics bölümünden yapılır;
// yapılandırılmamışsa hiçbir şey yüklenmez.

export async function initAnalytics(): Promise<void> {
  try {
    const res = await fetch('/api/analytics-config');
    if (!res.ok) return;

    const json = (await res.json()) as {
      success: boolean;
      data: { url: string; websiteId: string } | null;
    };
    if (!json.data?.url || !json.data.websiteId) return;

    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = `${json.data.url.replace(/\/+$/, '')}/script.js`;
    script.dataset.websiteId = json.data.websiteId;
    document.head.appendChild(script);
  } catch {
    // Analytics yüklenemezse site çalışmaya devam eder
  }
}
