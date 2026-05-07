import api from '../lib/api';

const unwrap = r => r.data?.data ?? r.data;
const arr    = v => (Array.isArray(v) ? v : []);

const cagnotteService = {
  getCagnottes: async (params) => {
    const response = await api.get('/cagnottes', { params });
    const d = unwrap(response);
    return Array.isArray(d) ? d : d?.cagnottes || d?.data || [];
  },
  getCagnotteById: async (id) => {
    const response = await api.get(`/cagnottes/${id}`);
    const d = unwrap(response);
    return d?.cagnotte || d;
  },
  getDonors: async (id) => {
    const response = await api.get(`/cagnottes/${id}/donors`);
    return arr(unwrap(response));
  },
  getUpdates: async (id) => {
    const response = await api.get(`/cagnottes/${id}/updates`);
    return arr(unwrap(response));
  },
  requestCagnotte: async (data) => {
    const response = await api.post('/cagnottes/request', data, {
      headers: data instanceof FormData
        ? { 'Content-Type': 'multipart/form-data' }
        : {},
    });
    return unwrap(response);
  },
  getMyRequests: async () => {
    const response = await api.get('/cagnottes/my-requests');
    return arr(unwrap(response));
  },
  donate: async (id, data) => {
    const response = await api.post(`/cagnottes/${id}/donate`, data);
    return unwrap(response);
  },
  getPendingCagnottes: async () => {
    const response = await api.get('/employee/cagnottes/pending');
    return arr(unwrap(response));
  },
  findCagnotteByCode: async (code) => {
    const response = await api.get(`/employee/cagnottes/code/${code}`);
    const d = unwrap(response);
    return d?.cagnotte || d;
  },
  approveCagnotte: async (id) => {
    const response = await api.post(`/employee/cagnottes/${id}/approve`);
    return unwrap(response);
  },
  rejectCagnotte: async (id, data) => {
    const response = await api.post(`/employee/cagnottes/${id}/reject`, data);
    return unwrap(response);
  },
};

export default cagnotteService;
