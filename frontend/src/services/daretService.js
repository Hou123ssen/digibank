import api from '../lib/api';

const daretService = {
  createDaret: async (data) => {
    const response = await api.post('/darets', data);
    return response.data;
  },
  joinDaret: async (id) => {
    const response = await api.post(`/darets/${id}/join`);
    return response.data;
  },
  startDaret: async (id) => {
    const response = await api.post(`/darets/${id}/start`);
    return response.data;
  },
  payDaret: async (id, data) => {
    const response = await api.post(`/darets/${id}/pay`, data);
    return response.data;
  },
};

export default daretService;
