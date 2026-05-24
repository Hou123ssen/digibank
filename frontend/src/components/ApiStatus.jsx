function ApiStatus() {
  return (
    <section className="status-panel">
      <h2>Laravel API</h2>
      <p>Configured for {import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api'}</p>
    </section>
  );
}

export default ApiStatus;

