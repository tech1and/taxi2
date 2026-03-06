import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const taxiparksAPI = {
  getList: (params = {}) =>
    api.get('/api/taxiparks/', { params }),

  getDetail: (slug) =>
    api.get(`/api/taxiparks/${slug}/`),

  like: (slug) =>
    api.post(`/api/taxiparks/${slug}/like/`),

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