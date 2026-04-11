// pages/sitemap.js
import Head from 'next/head';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://reyting-taksoparkov-moskvy.ru';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const staticPages = [
  { path: '/', label: '🏠 Главная' },
  { path: '/rating', label: '📊 Рейтинг таксопарков' },
  { path: '/blog', label: '📰 Блог' },
  { path: '/about', label: 'ℹ️ О нас' },
  { path: '/privacy', label: '🔒 Политика конфиденциальности' },
  { path: '/sitemap', label: '🗺️ Карта сайта' },
];

export async function getStaticProps() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // Вычитываем ВСЕ страницы таксопарков
    async function fetchAllPages(url) {
      const all = [];
      let nextUrl = url;
      while (nextUrl) {
        const res = await fetch(nextUrl, { signal: controller.signal });
        const data = await res.json();
        all.push(...(data.results || []));
        nextUrl = data.next || null;
      }
      return all;
    }

    const [taxiparks, postsData] = await Promise.all([
      fetchAllPages(`${API_URL}/api/taxiparks/?page_size=50`),
      fetch(`${API_URL}/api/blog/posts/?page_size=100`, { signal: controller.signal }).then(r => r.json()),
    ]);

    clearTimeout(timeout);

    const posts = postsData.results || postsData || [];

    return {
      props: {
        taxiparks,
        posts,
      },
      revalidate: 3600,
    };
  } catch (error) {
    console.error('Sitemap page fetch error:', error);
    return { props: { taxiparks: [], posts: [] }, revalidate: 3600 };
  }
}

export default function SitemapPage({ taxiparks, posts }) {
  return (
    <>
      <Head>
        <title>Карта сайта | Рейтинг таксопарков Москвы</title>
        <meta name="description" content="Полная карта сайта для удобной навигации" />
      </Head>

      <main className="container py-5">
        <h1 className="mb-4">🗺️ Карта сайта</h1>

        {/* Основные разделы */}
        <section className="mb-5">
          <h2 className="h4 mb-3">Основные разделы</h2>
          <ul className="list-unstyled">
            {staticPages.map((page) => (
              <li key={page.path} className="mb-2">
                <a href={page.path} className="text-decoration-none">{page.label}</a>
              </li>
            ))}
          </ul>
        </section>

        {/* Таксопарки */}
        <section className="mb-5">
          <h2 className="h4 mb-3">🚕 Таксопарки ({taxiparks.length})</h2>
          {taxiparks.length > 0 ? (
            <ul className="list-unstyled">
              {taxiparks.map((park) => (
                <li key={park.id} className="mb-1">
                  <a href={`/taxiparks/${park.slug}`} className="text-decoration-none">
                    {park.name}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Не удалось загрузить список таксопарков</p>
          )}
        </section>

        {/* Статьи блога */}
        <section>
          <h2 className="h4 mb-3">📰 Статьи ({posts.length})</h2>
          {posts.length > 0 ? (
            <ul className="list-unstyled">
              {posts.map((post) => (
                <li key={post.id} className="mb-2">
                  <a href={`/blog/${post.slug}`} className="text-decoration-none">
                    {post.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Не удалось загрузить статьи</p>
          )}
        </section>

        {/* Файлы */}
        <section className="mt-5 pt-4 border-top">
          <h2 className="h4 mb-3">📄 Файлы</h2>
          <ul className="list-unstyled">
            <li><a href="/sitemap.xml">🗂️ sitemap.xml (для поисковиков)</a></li>
            <li><a href="/robots.txt">🤖 robots.txt</a></li>
          </ul>
        </section>
      </main>
    </>
  );
}