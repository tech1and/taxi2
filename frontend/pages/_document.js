import { Html, Head, Main, NextScript } from 'next/document';
import Analytics from '../components/Analytics';

export default function Document() {
	return (
		<Html lang="ru">
		<Head>
		<meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* 🔹 Фавиконки */}
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* 🔹 Мета-теги */}
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Такси Рейтинг" />
        
        {/* 🔹 Верификация для поисковиков */}
        {process.env.NEXT_PUBLIC_BING_VERIFICATION && (
			<meta
            name="msvalidate.01"
            content={process.env.NEXT_PUBLIC_BING_VERIFICATION}
			/>
		)}
        {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
			<meta
            name="google-site-verification"
            content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION}
			/>
		)}
		{process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION && (
			<meta
            name="yandex-verification"
            content={process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION}
			/>
		)}
		</Head>
		<body>
        <Main />
        <NextScript />
        <Analytics />
		</body>
		</Html>
	);
}