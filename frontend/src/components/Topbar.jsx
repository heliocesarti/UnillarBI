import FilterDropdown from './FilterDropdown';
import { FILIAIS } from '../constants/filtros';

const StoreIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M9 20v-6h6v6" /></svg>;
const SyncIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></svg>;
const ClearIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>;
const LogoutIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>;

function iniciais(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[partes.length - 1]?.[0] || '')).toUpperCase();
}

export default function Topbar({ title, subtitle, filial, onFilialChange, showSync, syncStatus, onSincronizar, showLimparFiltros, onLimparFiltros, mostrarFiltroFilial = true, usuario, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <div className="subtitle">{subtitle}</div>
      </div>
      <div className="topbar-spacer" />

      {showLimparFiltros && (
        <button className="date-filter-btn" onClick={onLimparFiltros}>
          {ClearIcon}
          <span>Limpar filtros</span>
        </button>
      )}

      {showSync && (
        <button className="date-filter-btn" onClick={onSincronizar} disabled={syncStatus === 'computing'}>
          {SyncIcon}
          <span>{syncStatus === 'computing' ? 'Sincronizando...' : 'Sincronizar'}</span>
        </button>
      )}

      {mostrarFiltroFilial && (
        <FilterDropdown icon={StoreIcon} options={FILIAIS} selectedKey={filial} onSelect={onFilialChange} footer="Afeta Indisponível — outras telas ainda são dados de demonstração" />
      )}

      <div className="user-chip">
        <div className="user-avatar">{iniciais(usuario?.nome)}</div>
        <div className="who">
          <b>{usuario?.nome}</b>
          <span>{usuario?.papel === 'admin' ? 'Administrador' : 'Usuário'}</span>
        </div>
        <button className="icon-btn user-logout-btn" onClick={onLogout} title="Sair" aria-label="Sair">
          {LogoutIcon}
        </button>
      </div>
    </header>
  );
}
