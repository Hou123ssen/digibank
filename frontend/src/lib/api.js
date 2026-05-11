import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request interceptor for attaching token and fixing FormData content-type
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('digibank_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let the browser set the correct multipart boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('digibank_token');
      // Use window.location for redirect to ensure clean state
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
