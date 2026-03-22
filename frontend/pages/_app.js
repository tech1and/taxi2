import '../styles/globals.css';
import { usePageView } from '../hooks/usePageView';
import CookieNotice from '../components/CookieNotice';
import Analytics from '../components/Analytics';

export default function MyApp({ Component, pageProps }) {
  
  usePageView();

  return (
    <>	
      <Component {...pageProps} />
	  <Analytics />
      <CookieNotice />
    </>
  );
}