export const config = { runtime: 'nodejs' };

const BASE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://reyting-taksoparkov-moskvy.ru';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const staticPages = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/rating', priority: 0.9, changefreq: 'daily' },
  { path: '/blog', priority: 0.8, changefreq: 'weekly' },
  { path: '/about', priority: 0.5, changefreq: 'monthly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/sitemap', priority: 0.3, changefreq: 'monthly' },
];

const formatDate = (date) => {
  if (!date) return new Date().toISOString();
  return new Date(date).toISOString();
};

export default async function handler(req, res) {
  try {
    // Вычитываем ВСЕ страницы
    async function fetchAllPages(url) {
      const all = [];
      let nextUrl = url;
      while (nextUrl) {
        const r = await fetch(nextUrl, { next: { revalidate: 3600 } });
        const text = await r.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          console.error(`Sitemap XML: не JSON ответ от ${nextUrl}`);
          break;
        }
        all.push(...(data.results || []));
        nextUrl = data.next || null;
      }
      return all;
    }

    const [taxiparks, posts] = await Promise.all([
      fetchAllPages(`${API_URL}/api/taxiparks/?page_size=50`),
      fetchAllPages(`${API_URL}/api/blog/posts/?page_size=100`),
    ]);

    // Формируем массив всех URL
    const urls = [
      ...staticPages.map((page) => ({
        loc: `${BASE_URL}${page.path}`,
        lastmod: new Date().toISOString(),
        changefreq: page.changefreq,
        priority: page.priority,
      })),
      ...taxiparks.map((park) => ({
        loc: `${BASE_URL}/taxiparks/${park.slug}`,
        lastmod: formatDate(park.updated_at || park.created_at),
        changefreq: 'weekly',
        priority: 0.7,
      })),
      ...posts.map((post) => ({
        loc: `${BASE_URL}/blog/${post.slug}`,
        lastmod: formatDate(post.updated_at || post.created_at),
        changefreq: 'monthly',
        priority: 0.6,
      })),
    ];

    // Генерируем XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=59');
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Sitemap XML error:', error);
    res.status(500).send('Error generating sitemap');
  }
}