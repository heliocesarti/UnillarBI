export default function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
      <h3>{title}</h3>
      <p>{message || 'Conteúdo desta aba ainda será definido.'}</p>
    </div>
  );
}
