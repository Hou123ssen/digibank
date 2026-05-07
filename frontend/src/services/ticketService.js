import api from '../lib/api';

const unwrap = r => r.data?.data ?? r.data;

const ticketService = {
  createTicket: async (data) => {
    const response = await api.post('/tickets', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return unwrap(response);
  },
  getMyTickets: async () => {
    const response = await api.get('/tickets/my');
    const d = unwrap(response);
    return Array.isArray(d) ? d : d?.tickets || [];
  },
  getTicketById: async (id) => {
    const response = await api.get(`/tickets/${id}`);
    const d = unwrap(response);
    return d?.ticket || d;
  },
  sendMessage: async (id, data) => {
    const response = await api.post(`/tickets/${id}/message`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return unwrap(response);
  },
  getEmployeeTickets: async () => {
    const response = await api.get('/employee/tickets');
    const d = unwrap(response);
    return Array.isArray(d) ? d : d?.tickets || [];
  },
  assignTicket: async (id) => {
    const response = await api.post(`/employee/tickets/${id}/assign`);
    return unwrap(response);
  },
  replyTicket: async (id, data) => {
    const response = await api.post(`/employee/tickets/${id}/reply`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return unwrap(response);
  },
  resolveTicket: async (id) => {
    const response = await api.post(`/employee/tickets/${id}/resolve`);
    return unwrap(response);
  },
  closeTicket: async (id) => {
    const response = await api.post(`/employee/tickets/${id}/close`);
    return unwrap(response);
  },
  updateTicketStatus: async (id, status) => {
    const response = await api.post(`/employee/tickets/${id}/${status}`);
    return unwrap(response);
  },
};

export default ticketService;
