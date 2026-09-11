import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Ruptura from './Ruptura';

// Só Ruptura está pronta — as demais sub-abas ficam em manutenção
// (visíveis no menu, sem apagar nada, só mostrando aviso em vez do
// conteúdo) até serem finalizadas.
const SUBTABS_ATIVAS = ['ruptura'];

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

// `active` agora é controlado pelo App (não é mais estado local daqui) —
// é assim que o Topbar sabe qual sub-aba está selecionada pra saber o que
// o botão único de "Sincronizar" deve disparar. `syncRef` é encaminhado
// pra qualquer que seja a sub-aba renderizada no momento (só Ruptura e
// Indisponível aceitam, por terem consulta pesada com "Atualizar dados").
export default function Estoque({ filial, active, onActiveChange, syncRef, onSyncStatusChange }) {
  // Sub-abas ocultas temporariamente (Configurações > Estoque >
  // Visibilidade das sub-abas) — não apaga nada, só tira do menu e do
  // roteamento enquanto durar. "ruptura" nunca entra nessa lista (trava
  // no backend). Carregado uma vez; F5 pega config nova.
  const [ocultas, setOcultas] = useState([]);

  useEffect(() => {
    api.getConfig()
      .then(all => setOcultas(all.visibilidade?.estoque_subtabs_ocultas ?? []))
      .catch(() => {});
  }, []);

  const subtabsVisiveis = SUBTABS.filter(t => !ocultas.includes(t.key));

  // Se a sub-aba selecionada ficou oculta (config mudou, ou é o valor
  // inicial de outra sessão), pula sozinho pra primeira visível assim que
  // a lista de ocultas carrega — nunca deixa o usuário preso numa aba que
  // sumiu do menu.
  useEffect(() => {
    if (ocultas.includes(active) && subtabsVisiveis[0]) {
      onActiveChange(subtabsVisiveis[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocultas, active]);

  const ativoVisivel = !ocultas.includes(active);

  return (
    <>
      <div className="subtabs">
        {subtabsVisiveis.map(t => (
          <button
            key={t.key}
            className={'subtab' + (active === t.key ? ' active' : '')}
            onClick={() => onActiveChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={active} className="view-anim">
        {ativoVisivel && active === 'ruptura' && <Ruptura ref={syncRef} onSyncStatusChange={onSyncStatusChange} />}
        {ativoVisivel && !SUBTABS_ATIVAS.includes(active) && (
          <EmptyState title={SUBTABS.find(t => t.key === active)?.label} message="Este ambiente está em manutenção." />
        )}
      </div>
    </>
  );
}
