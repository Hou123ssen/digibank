import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api';
const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '');

let echo = null;

export const getEcho = () => {
  if (echo) return echo;

  const token = localStorage.getItem('digibank_token');
  const scheme = import.meta.env.VITE_REVERB_SCHEME || 'http';
  const host = import.meta.env.VITE_REVERB_HOST || '127.0.0.1';
  const port = Number(import.meta.env.VITE_REVERB_PORT || 8080);
  const forceTLS = scheme === 'https';

  echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS,
    encrypted: forceTLS,
    enabledTransports: forceTLS ? ['wss'] : ['ws'],
    authEndpoint: `${apiOrigin}/broadcasting/auth`,
    auth: {
      headers: {
        Accept: 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    },
  });

  return echo;
};

export const disconnectEcho = () => {
  if (!echo) return;
  echo.disconnect();
  echo = null;
};

export const realtimeConnection = () => getEcho()?.connector?.pusher?.connection;
