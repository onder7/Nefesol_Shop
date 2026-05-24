import { Wrench, Globe, Mail } from 'lucide-react';

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface MaintenanceProps {
  message?: string;
}

export default function Maintenance({ message }: MaintenanceProps) {
  const currentYear = new Date().getFullYear();
  const displayMessage = message || 'Sistemimizde güncelleme ve iyileştirme çalışmaları yapılmaktadır. En kısa sürede yeniden hizmetinizde olacağız. Anlayışınız için teşekkür ederiz.';

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-6 py-12 text-slate-100 selection:bg-primary selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950" />
      <div className="absolute top-1/4 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 left-1/3 -z-10 h-72 w-72 rounded-full bg-indigo-500/5 blur-[100px]" />

      {/* Main Content Card */}
      <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        {/* Animated Icon Container */}
        <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary/10 to-indigo-500/10 opacity-50" />
          <Wrench className="h-10 w-10 text-primary animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </div>

        {/* Company Logo or Name */}
        <span className="mb-2 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          MaBridge Global
        </span>

        {/* Title */}
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Şu Anda Bakımdayız
        </h1>

        {/* Decorative Divider */}
        <div className="my-6 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-indigo-500" />

        {/* Custom Admin Announcement Message */}
        <p className="mb-10 text-lg leading-relaxed text-slate-400">
          {displayMessage}
        </p>

        {/* Contact/Social Links */}
        <div className="flex items-center justify-center gap-4 border-t border-slate-900 pt-8 w-full">
          <a
            href="mailto:info@mabridgeglobal.com"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 hover:border-primary hover:text-primary transition-all duration-300"
            title="E-posta Gönder"
          >
            <Mail className="h-4 w-4" />
          </a>
          <a
            href="https://mabridgeglobal.com"
            target="_blank"
            rel="noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 hover:border-primary hover:text-primary transition-all duration-300"
            title="Web Sitesi"
          >
            <Globe className="h-4 w-4" />
          </a>
          <a
            href="https://github.com/onder7"
            target="_blank"
            rel="noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 hover:border-primary hover:text-primary transition-all duration-300"
            title="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="absolute bottom-8 text-center text-xs text-slate-600">
        <p>© {currentYear} MaBridge. Tüm hakları saklıdır.</p>
      </div>
    </div>
  );
}
