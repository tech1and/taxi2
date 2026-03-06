import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ru">
      <Head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta name="theme-color" content="#1a1a2e" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}