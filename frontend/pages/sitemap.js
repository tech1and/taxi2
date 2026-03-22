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
    const timeout = setTimeout(() => controller.abort(), 8000);

    const [taxiparksRes, blogRes] = await Promise.all([
      fetch(`${API_URL}/api/taxiparks/?limit=50`, { signal: controller.signal }),
      fetch(`${API_URL}/api/blog/posts/?limit=30`, { signal: controller.signal }),
    ]);

    clearTimeout(timeout);

    const taxiparksData = await taxiparksRes.json();
    const blogData = await blogRes.json();

    return {
      props: {
        taxiparks: taxiparksData.results || taxiparksData || [],
        posts: blogData.results || blogData || [],
      },
      revalidate: 3600,
    };
  } catch (error) {
    console.error('Sitemap page fetch error:', error);
    // Возвращаем пустые данные, но страница отрендерится
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
              {taxiparks.slice(0, 30).map((park) => (
                <li key={park.id} className="mb-1">
                  <a href={`/taxiparks/${park.slug}`} className="text-decoration-none">
                    {park.name}
                  </a>
                </li>
              ))}
              {taxiparks.length > 30 && (
                <li><a href="/rating" className="text-muted">→ Все таксопарки</a></li>
              )}
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
              {posts.slice(0, 20).map((post) => (
                <li key={post.id} className="mb-2">
                  <a href={`/blog/${post.slug}`} className="text-decoration-none">
                    {post.title}
                  </a>
                </li>
              ))}
              {posts.length > 20 && (
                <li><a href="/blog" className="text-muted">→ Все статьи</a></li>
              )}
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