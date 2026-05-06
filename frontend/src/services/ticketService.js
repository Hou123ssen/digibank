import api from '../lib/api';

const ticketService = {
  createTicket: async (data) => {
    const response = await api.post('/tickets', data);
    return response.data;
  },
  getMyTickets: async () => {
    const response = await api.get('/tickets/my');
    return response.data;
  },
  sendMessage: async (id, data) => {
    const response = await api.post(`/tickets/${id}/message`, data);
    return response.data;
  },
  getEmployeeTickets: async () => {
    const response = await api.get('/employee/tickets');
    return response.data;
  },
  assignTicket: async (id) => {
    const response = await api.post(`/employee/tickets/${id}/assign`);
    return response.data;
  },
  replyTicket: async (id, data) => {
    const response = await api.post(`/employee/tickets/${id}/reply`, data);
    return response.data;
  },
  resolveTicket: async (id) => {
    const response = await api.post(`/employee/tickets/${id}/resolve`);
    return response.data;
  },
  closeTicket: async (id) => {
    const response = await api.post(`/tickets/${id}/close`);
    return response.data;
  },
};

export default ticketService;
