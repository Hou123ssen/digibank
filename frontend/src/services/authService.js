import api from '../lib/api';

const authService = {
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data?.data || response.data;
  },
  login: async (data) => {
    const response = await api.post("/auth/login", data);
    return response.data?.data || response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data?.data || response.data;
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data?.data || response.data;
  },
};

export default authService;
