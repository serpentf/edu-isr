import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 from login/register means wrong credentials: let the form show the message.
    // 401 from /auth/me at startup means an expired session: the store logs out and the
    // visitor stays on the current page as a guest.
    const isAuthRequest = /\/auth\/(login|register|me)$/.test(error.config?.url || '');
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me')
};

// Courses API
export const coursesAPI = {
  getAll: (params) => api.get('/courses', { params }),
  getById: (id) => api.get(`/courses/${id}`),
  getBySlug: (slug) => api.get(`/courses/slug/${slug}`),
  getLesson: (lessonId) => api.get(`/courses/lessons/${lessonId}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`)
};

// Progress API
export const progressAPI = {
  get: (userId) => api.get(`/progress/${userId}`),
  updateLesson: (lessonId, data) => api.put(`/progress/lesson/${lessonId}`, data),
  submitQuiz: (lessonId, answers) => api.post(`/progress/lesson/${lessonId}/quiz`, { answers }),
  getCourse: (courseId) => api.get(`/progress/course/${courseId}`)
};

// Certificates API
export const certificatesAPI = {
  status: (courseId) => api.get(`/certificates/course/${courseId}/status`),
  issue: (courseId, fullName) => api.post(`/certificates/course/${courseId}`, { full_name: fullName }),
  mine: () => api.get('/certificates/mine'),
  verify: (code) => api.get(`/certificates/verify/${encodeURIComponent(code)}`),
  list: () => api.get('/certificates'),
  revoke: (id, reason) => api.post(`/certificates/${id}/revoke`, { reason })
};

// Admin statistics API
export const statsAPI = {
  courses: () => api.get('/admin/stats/courses'),
  course: (courseId) => api.get(`/admin/stats/courses/${courseId}`),
  student: (courseId, userId) => api.get(`/admin/stats/courses/${courseId}/students/${userId}`)
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`)
};

export default api;
