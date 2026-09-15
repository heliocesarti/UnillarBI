import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Ruptura from './Ruptura';
import { useMobileLayout } from '../../utils/useMobileLayout';

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

// Celular em pé: em vez da barra de abas (fica comprimida/difícil de ler
// com até 8 rótulos numa tela estreita), mostra só o nome da sub-aba atual,
// centralizado, com setas pra trocar — mesmo padrão visual já usado no
// paginador de Configurações > Documentação (`.doc-paginador` e cia),
// reaproveitado aqui em vez de criar um componente/CSS novo.
function SubtabPaginador({ itens, indice, onIndice }) {
  const atual = itens[indice];
  return (
    <div className="doc-paginador">
      <button className="doc-pag-seta" onClick={() => onIndice(indice - 1)} disabled={indice === 0} aria-label="Sub-aba anterior">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <div className="doc-pag-info">
        <div className="doc-pag-titulo">{atual.label}</div>
        <div className="doc-pag-dots">
          {itens.map((it, i) => (
            <button
              key={it.key}
              className={'doc-pag-dot' + (i === indice ? ' active' : '')}
              onClick={() => onIndice(i)}
              title={it.label}
              aria-label={it.label}
            />
          ))}
        </div>
      </div>
      <button className="doc-pag-seta" onClick={() => onIndice(indice + 1)} disabled={indice === itens.length - 1} aria-label="Próxima sub-aba">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>
  );
}

// `active` agora é controlado pelo App (não é mais estado local daqui) —
// é assim que o Topbar sabe qual sub-aba está selecionada pra saber o que
// o botão único de "Sincronizar" deve disparar. `syncRef` é encaminhado
// pra qualquer que seja a sub-aba renderizada no momento (só Ruptura e
// Indisponível aceitam, por terem consulta pesada com "Atualizar dados").
export default function Estoque({ filial, active, onActiveChange, syncRef, onSyncStatusChange, isAdmin }) {
  const { portrait } = useMobileLayout();
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
  const indiceAtivo = Math.max(0, subtabsVisiveis.findIndex(t => t.key === active));

  return (
    <>
      {portrait ? (
        <SubtabPaginador
          itens={subtabsVisiveis}
          indice={indiceAtivo}
          onIndice={(i) => subtabsVisiveis[i] && onActiveChange(subtabsVisiveis[i].key)}
        />
      ) : (
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
      )}

      {/* Ruptura fica montada o tempo todo (nunca desmonta), só escondida
          via `hidden` quando não é a sub-aba ativa — antes tinha
          `key={active}` na div em volta, que forçava desmontar/remontar
          TUDO a cada troca de sub-aba. Ida-e-volta (ex: Ruptura ->
          Indisponível -> Ruptura) perdia o estado carregado e reiniciava a
          busca do zero, fazendo a tela "Nenhum dado carregado ainda"/
          "Calculando..." reaparecer toda vez, mesmo já tendo carregado
          antes na mesma sessão. Ruptura nunca fica oculta pelo config
          (trava no backend), não precisa do `ativoVisivel` aqui. */}
      <div hidden={active !== 'ruptura'} className={active === 'ruptura' ? 'view-anim' : undefined}>
        <Ruptura ref={syncRef} onSyncStatusChange={onSyncStatusChange} isAdmin={isAdmin} />
      </div>
      {active !== 'ruptura' && (
        <div key={active} className="view-anim">
          {ativoVisivel && !SUBTABS_ATIVAS.includes(active) && (
            <EmptyState title={SUBTABS.find(t => t.key === active)?.label} message="Este ambiente está em manutenção." />
          )}
        </div>
      )}
    </>
  );
}
