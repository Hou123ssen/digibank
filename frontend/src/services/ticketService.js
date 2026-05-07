import api from '../lib/api';

const unwrap = r => r.data?.data ?? r.data;
const asArray = v => (Array.isArray(v) ? v : []);
const normalizeMessage = (message, ticket) => ({
  ...message,
  content: message?.content ?? message?.message ?? '',
  sender_name: message?.sender_name ?? message?.sender?.name,
  sender_type: message?.sender_type ?? (message?.sender_id === ticket?.user_id ? 'user' : 'employee'),
});
const normalizeTicket = ticket => ticket ? ({
  ...ticket,
  subject: ticket.subject ?? ticket.title ?? '',
  reference: ticket.reference ?? `#${ticket.id}`,
  assigned_employee: ticket.assigned_employee ?? ticket.assignee,
  messages: asArray(ticket.messages).map(message => normalizeMessage(message, ticket)),
}) : null;

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
    const tickets = Array.isArray(d) ? d : d?.tickets || [];
    return asArray(tickets).map(normalizeTicket);
  },
  getTicketById: async (id, options = {}) => {
    const tickets = options.employee
      ? await ticketService.getEmployeeTickets()
      : await ticketService.getMyTickets();

    return asArray(tickets).find(ticket => String(ticket.id) === String(id)) || null;
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
    const tickets = Array.isArray(d) ? d : d?.tickets || [];
    return asArray(tickets).map(normalizeTicket);
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
    if (status === 'resolved') {
      return ticketService.resolveTicket(id);
    }

    if (status === 'closed') {
      return ticketService.closeTicket(id);
    }

    return Promise.reject(new Error(`Unsupported ticket status action: ${status}`));
  },
};

export default ticketService;
