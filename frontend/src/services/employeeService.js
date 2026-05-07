import api from '../lib/api';

const unwrap = r => r.data?.data ?? r.data;
const arr    = v => (Array.isArray(v) ? v : []);

const employeeService = {
  getDashboardStats: async () => {
    const r = await api.get('/employee/stats');
    return unwrap(r);
  },
  getMyPerformance: async () => {
    const r = await api.get('/employee/performance');
    return unwrap(r);
  },
  getActivityFeed: async () => {
    const r = await api.get('/employee/activity');
    const d = unwrap(r);
    return arr(Array.isArray(d) ? d : d?.activities);
  },
};

export default employeeService;
