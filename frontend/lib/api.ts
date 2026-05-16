import axios from 'axios';
import { getGuestToken, setGuestToken } from './guestToken';

// No baseURL — axios 1.7+ does not combine relative baseURL with
// absolute-path URLs (starting with '/').  We prepend /api explicitly
// inside the request interceptor instead.
const api = axios.create({
  withCredentials: true,
});

// Request interceptor - prepend /api prefix + add auth/guest token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Prepend /api to every relative URL that doesn't already have it
    if (config.url && !config.url.startsWith('http') && !config.url.startsWith('/api')) {
      config.url = '/api' + config.url;
    }

    const token = localStorage.getItem('ilena_token');
    if (token) {
      // Authenticated user - use JWT token
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Guest user - use guest token if available
      const guestToken = getGuestToken();
      if (guestToken) {
        config.headers['X-Guest-Token'] = guestToken;
      }
    }
  }
  return config;
});

// Response interceptor - store guest token and handle errors
api.interceptors.response.use(
  (res) => {
    // If response contains guest_token, store it
    if (res.data?.guest_token && typeof window !== 'undefined') {
      setGuestToken(res.data.guest_token);
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const requestUrl = err.config?.url || '';
      const hasToken = Boolean(localStorage.getItem('ilena_token'));

      localStorage.removeItem('ilena_token');

      // Public pages may call /auth/me only to check optional login state.
      // Do not force guests from home/catalog/planner to /login.
      if (hasToken && !requestUrl.includes('/auth/me')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
