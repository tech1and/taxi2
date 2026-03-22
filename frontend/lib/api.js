import axios from 'axios';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').trim();

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 🔥 Обязательно: отправлять куки (включая csrftoken)
});

// 🔥 Интерцептор: автоматически добавляет CSRF-токен к POST/PUT/DELETE запросам
api.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrftoken');
  
  // Добавляем токен только к "изменяющим" запросам и только если он есть
  if (csrfToken && config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
    config.headers['X-CSRFToken'] = csrfToken;
  }
  
  return config;
});

// 🍪 Вспомогательная функция для получения куки по имени
function getCookie(name) {
  if (typeof document === 'undefined') return null; // SSR-защита для Next.js
  
  const cookieString = document.cookie;
  if (!cookieString) return null;
  
  const cookies = cookieString.split(';');
  for (let cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
}

// 🔥 Интерцептор ответов: удобная обработка ошибок (опционально)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      console.warn('CSRF ошибка: проверьте, что токен получен и отправлен');
    }
    return Promise.reject(error);
  }
);

export const taxiparksAPI = {
  getList: (params = {}) =>
    api.get('/api/taxiparks/', { params }),
  
  getDetail: (slug) =>
    api.get(`/api/taxiparks/${slug}/`),
  
  like: (slug) =>
    api.post(`/api/taxiparks/${slug}/like/`), // Теперь будет с CSRF-токеном!
  
  addComment: (slug, data) =>
    api.post(`/api/taxiparks/${slug}/comment/`, data),
};

export const blogAPI = {
  getPosts: (params = {}) =>
    api.get('/api/blog/posts/', { params }),
  getPost: (slug) =>
    api.get(`/api/blog/posts/${slug}/`),
  getCategories: () =>
    api.get('/api/blog/categories/'),
};

export default api;