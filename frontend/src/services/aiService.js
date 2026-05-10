import api from '../lib/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const aiService = {
  getConversations: async () => {
    const response = await api.get('/ai/conversations');
    return response.data?.data?.conversations ?? [];
  },

  getConversation: async (id) => {
    const response = await api.get(`/ai/conversations/${id}`);
    return response.data?.data?.conversation ?? null;
  },

  chat: async (payload) => {
    const response = await api.post('/ai/chat', payload);
    return response.data?.data ?? null;
  },

  streamChat: async (payload, { onDelta, onDone } = {}) => {
    const token = localStorage.getItem('digibank_token');

    const response = await fetch(`${API_BASE}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.message || 'AI assistant unavailable.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      events.forEach(event => {
        const line = event.split('\n').find(item => item.startsWith('data: '));
        if (!line) return;

        const data = JSON.parse(line.slice(6));
        if (data.delta) onDelta?.(data.delta);
        if (data.done) onDone?.(data);
      });
    }
  },
};

export default aiService;
