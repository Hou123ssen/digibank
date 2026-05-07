import api from '../lib/api';

const unwrapData = (response) => response.data?.data ?? response.data;
const unwrapDaret = (response) => {
  const data = unwrapData(response);
  return data?.daret || data;
};
const unwrapDarets = (response) => {
  const data = unwrapData(response);
  const darets = Array.isArray(data) ? data : data?.darets || [];
  return Array.isArray(darets) ? darets : [];
};

const daretService = {
  getMyDarets: async () => {
    const response = await api.get('/darets/my');
    return unwrapDarets(response);
  },
  getAllDarets: async () => {
    const response = await api.get('/darets');
    return unwrapDarets(response);
  },
  getDaretById: async (id) => {
    const response = await api.get(`/darets/${id}`);
    return unwrapDaret(response);
  },
  createDaret: async (data) => {
    const response = await api.post('/darets', data);
    return unwrapDaret(response);
  },
  joinDaret: async (id) => {
    const response = await api.post(`/darets/${id}/join`);
    return unwrapDaret(response);
  },
  startDaret: async (id) => {
    const response = await api.post(`/darets/${id}/start`);
    return unwrapDaret(response);
  },
  payDaret: async (id, data) => {
    const response = await api.post(`/darets/${id}/pay`, data);
    return unwrapData(response);
  },
};

export default daretService;
