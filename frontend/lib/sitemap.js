export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://reyting-taksoparkov-moskvy.ru';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const staticPages = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/rating', priority: 0.9, changefreq: 'daily' },
  { path: '/blog', priority: 0.8, changefreq: 'weekly' },
  { path: '/about', priority: 0.5, changefreq: 'monthly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/sitemap', priority: 0.3, changefreq: 'monthly' },
];

export const formatDate = (date) => {
  if (!date) return new Date().toISOString();
  return new Date(date).toISOString();
};

export const getUrl = (path) => `${BASE_URL}${path}`;