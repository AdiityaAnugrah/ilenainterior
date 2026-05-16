import axios, { type AxiosRequestConfig, type AxiosInstance } from 'axios';
import { getGuestToken, setGuestToken } from './guestToken';

// Normalize any path to live under /api/.
// - absolute URLs (http://, https://) pass through untouched
// - paths that already start with /api are untouched
// - everything else gets /api prepended
function ensureApiPrefix(url: string | undefined): string | undefined {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url === '/api' || url.startsWith('/api/')) return url;
  return '/api' + (url.startsWith('/') ? '' : '/') + url;
}

const rawApi = axios.create({
  withCredentials: true,
});

// Wrap every request-issuing method so the /api prefix is applied
// before axios computes the final URL. This is intentionally
// belt-and-suspenders: even if the request interceptor fails to run
// (some browsers were seeing stale chunks without it), the URL is
// still rewritten at the call site.
type UrlMethod = 'get' | 'delete' | 'head' | 'options';
type DataMethod = 'post' | 'put' | 'patch';

const urlMethods: UrlMethod[] = ['get', 'delete', 'head', 'options'];
const dataMethods: DataMethod[] = ['post', 'put', 'patch'];

for (const m of urlMethods) {
  const original = rawApi[m].bind(rawApi);
  (rawApi as unknown as Record<string, unknown>)[m] = function (
    url: string,
    config?: AxiosRequestConfig
  ) {
    return original(ensureApiPrefix(url) as string, config);
  };
}

for (const m of dataMethods) {
  const original = rawApi[m].bind(rawApi);
  (rawApi as unknown as Record<string, unknown>)[m] = function (
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ) {
    return original(ensureApiPrefix(url) as string, data, config);
  };
}

// Wrap request() too (some call sites use it directly).
const originalRequest = rawApi.request.bind(rawApi);
(rawApi as unknown as Record<string, unknown>).request = function (
  config: AxiosRequestConfig
) {
  if (config && typeof config === 'object' && typeof config.url === 'string') {
    config = { ...config, url: ensureApiPrefix(config.url) };
  }
  return originalRequest(config);
};

const api = rawApi as AxiosInstance;

// Interceptor still runs as a safety net + handles auth headers.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    if (typeof config.url === 'string') {
      config.url = ensureApiPrefix(config.url);
    }

    const token = localStorage.getItem('ilena_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      const guestToken = getGuestToken();
      if (guestToken) {
        config.headers['X-Guest-Token'] = guestToken;
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
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

      if (hasToken && !requestUrl.includes('/auth/me')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
