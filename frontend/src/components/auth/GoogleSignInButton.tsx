import { useEffect, useRef } from 'react';

const CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface Props {
  /** Buton metni: girişte 'signin_with', kayıtta 'signup_with' */
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  /** Google'dan dönen ID token ile çağrılır */
  onCredential: (idToken: string) => void;
}

/**
 * Google Identity Services (GSI) resmi giriş butonu.
 * VITE_GOOGLE_CLIENT_ID tanımlı değilse hiçbir şey render etmez.
 * GSI script'i index.html'de async yüklenir; hazır olana kadar bekleriz.
 */
export function GoogleSignInButton({ text = 'continue_with', onCredential }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // callback referansını sabit tut (yeniden init tetiklememek için)
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    const tryInit = () => {
      if (cancelled) return;
      const g = (window as any).google;
      if (!g?.accounts?.id || !containerRef.current) {
        // GSI script henüz yüklenmedi — kısa süre sonra tekrar dene
        window.setTimeout(tryInit, 200);
        return;
      }

      g.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (resp: { credential?: string }) => {
          if (resp?.credential) cbRef.current(resp.credential);
        },
      });

      containerRef.current.innerHTML = '';
      g.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text,
        shape: 'rectangular',
        logo_alignment: 'center',
        locale: 'tr',
        width: 320,
      });
    };

    tryInit();
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;
  return <div ref={containerRef} className="flex justify-center [&>div]:!w-full" />;
}
