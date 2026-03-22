import { useEffect } from 'react';
import { useRouter } from 'next/router';

export function usePageView() {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url) => {
      // Google Analytics
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'page_view', {
          page_path: url,
        });
      }
      
      // Яндекс.Метрика
      if (typeof window.ym !== 'undefined' && process.env.NEXT_PUBLIC_YANDEX_METRICA_ID) {
        window.ym(process.env.NEXT_PUBLIC_YANDEX_METRICA_ID, 'hit', url);
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router.events]);
}