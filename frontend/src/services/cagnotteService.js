import api from '../lib/api';

const cagnotteService = {
  requestCagnotte: async (data) => {
    const response = await api.post('/cagnottes/request', data);
    return response.data;
  },
  getMyRequests: async () => {
    const response = await api.get('/cagnottes/my-requests');
    return response.data;
  },
  getCagnottes: async () => {
    const response = await api.get('/cagnottes');
    return response.data;
  },
  donate: async (id, data) => {
    const response = await api.post(`/cagnottes/${id}/donate`, data);
    return response.data;
  },
  getPendingCagnottes: async () => {
    const response = await api.get('/employee/cagnottes/pending');
    return response.data;
  },
  findCagnotteByCode: async (code) => {
    const response = await api.get(`/employee/cagnottes/code/${code}`);
    return response.data;
  },
  approveCagnotte: async (id) => {
    const response = await api.post(`/employee/cagnottes/${id}/approve`);
    return response.data;
  },
  rejectCagnotte: async (id, data) => {
    const response = await api.post(`/employee/cagnottes/${id}/reject`, data);
    return response.data;
  },
};

export default cagnotteService;
