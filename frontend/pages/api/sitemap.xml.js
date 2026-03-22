export const config = { runtime: 'nodejs' };

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://reyting-taksoparkov-moskvy.ru';
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
    // Загружаем данные с бэкенда
    const [taxiparksRes, blogRes] = await Promise.all([
      fetch(`${API_URL}/api/taxiparks/?limit=200`, { next: { revalidate: 3600 } }),
      fetch(`${API_URL}/api/blog/posts/?limit=100`, { next: { revalidate: 3600 } }),
    ]);

    const taxiparksData = await taxiparksRes.json().catch(() => ({ results: [] }));
    const blogData = await blogRes.json().catch(() => ({ results: [] }));

    const taxiparks = taxiparksData.results || taxiparksData || [];
    const posts = blogData.results || blogData || [];

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