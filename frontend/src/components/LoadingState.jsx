export default function LoadingState({ error }) {
  if (error) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
        <h3>Não foi possível carregar os dados</h3>
        <p>Verifique se o backend está rodando em http://127.0.0.1:8000</p>
      </div>
    );
  }
  return (
    <div className="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
      <h3>Carregando...</h3>
      <p>Buscando dados do servidor.</p>
    </div>
  );
}
