import FilterDropdown from './FilterDropdown';

const RANGES = [
  { key: '7', label: 'Últimos 7 dias' },
  { key: '30', label: 'Últimos 30 dias' },
  { key: '60', label: 'Últimos 60 dias' },
  { key: '90', label: 'Últimos 90 dias' },
  { key: '12m', label: 'Últimos 12 meses' },
];

// Lista provisória — os códigos vêm do padrão observado nos dados reais.
// Já filtra de verdade na aba Ruptura; as outras telas ainda são mock e
// ignoram esse valor.
const FILIAIS = [
  { key: 'todas', label: 'Todas as filiais' },
  { key: '1', label: 'Filial 1' },
  { key: '6', label: 'Filial 6' },
  { key: '7', label: 'Filial 7' },
  { key: '8', label: 'Filial 8' },
  { key: '9', label: 'Filial 9' },
];

const CalendarIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
const StoreIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M9 20v-6h6v6" /></svg>;

export default function Topbar({ title, subtitle, dateRange, onDateRangeChange, filial, onFilialChange }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <div className="subtitle">{subtitle}</div>
      </div>
      <div className="topbar-spacer" />

      <FilterDropdown icon={StoreIcon} options={FILIAIS} selectedKey={filial} onSelect={onFilialChange} footer="Afeta a aba Ruptura — outras telas ainda são dados de demonstração" />
      <FilterDropdown icon={CalendarIcon} options={RANGES} selectedKey={dateRange} onSelect={onDateRangeChange} footer="Intervalo personalizado em breve" />

      <div className="user-chip">
        <div className="user-avatar">HC</div>
        <div className="who"><b>Hélio Cesar</b><span>Unillar</span></div>
      </div>
    </header>
  );
}
