import { useState } from 'react';
import EmptyState from '../../components/EmptyState';
import EstoqueGeral from './EstoqueGeral';
import Ruptura from './Ruptura';

const SUBTABS = [
  { key: 'geral', label: 'Geral' },
  { key: 'sem-giro', label: 'Sem Giro' },
  { key: 'ultimo-estoque', label: 'Último no Estoque' },
  { key: 'inativo-compra', label: 'Inativo p/ compra' },
  { key: 'margem', label: 'Margem' },
  { key: 'excesso', label: 'Excesso' },
  { key: 'indisponivel', label: 'Indisponível' },
  { key: 'ruptura', label: 'Ruptura' },
];

export default function Estoque({ dateRange, filial }) {
  const [active, setActive] = useState('geral');

  return (
    <>
      <div className="subtabs">
        {SUBTABS.map(t => (
          <button
            key={t.key}
            className={'subtab' + (active === t.key ? ' active' : '')}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={active} className="view-anim">
        {active === 'geral' && <EstoqueGeral />}
        {active === 'ruptura' && <Ruptura dateRange={dateRange} filial={filial} />}
        {!['geral', 'ruptura'].includes(active) && (
          <EmptyState title={SUBTABS.find(t => t.key === active)?.label} />
        )}
      </div>
    </>
  );
}
