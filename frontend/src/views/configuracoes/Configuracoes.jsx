import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import ConfigNav from './ConfigNav';
import RupturaConfigPanel from './paineis/RupturaConfigPanel';
import IndisponivelConfigPanel from './paineis/IndisponivelConfigPanel';
import VisibilidadeConfigPanel from './paineis/VisibilidadeConfigPanel';
import DocumentacaoPanel from './paineis/DocumentacaoPanel';
import AparenciaConfigPanel from './paineis/AparenciaConfigPanel';
import TelaInicialConfigPanel from './paineis/TelaInicialConfigPanel';

// Cada módulo "disponivel" no registro do backend precisa de uma entrada
// aqui apontando pro componente que renderiza os parâmetros dele. Um
// módulo sem entrada nesse mapa cai automaticamente no estado "pendente",
// mesmo que o backend já marque ele como disponível — evita tela em branco
// se alguém esquecer de conectar o painel novo.
const PAINEIS = {
  'estoque:ruptura': RupturaConfigPanel,
  'estoque:indisponivel': IndisponivelConfigPanel,
  'estoque:visibilidade': VisibilidadeConfigPanel,
  'documentacao:resumo': DocumentacaoPanel,
  'preferencias:aparencia': AparenciaConfigPanel,
  'preferencias:tela_inicial': TelaInicialConfigPanel,
};

export default function Configuracoes() {
  const [registry, setRegistry] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState(null);

  // Nada pré-selecionado ao abrir — nav toda recolhida, pra quem chegar
  // ter uma visão geral de onde pode ir antes de escolher, em vez de já
  // cair direto dentro de um módulo específico (era Estoque > Ruptura por
  // padrão antes).
  useEffect(() => {
    api.getConfigRegistry()
      .then(setRegistry)
      .catch(e => setLoadError(e.message));
  }, []);

  if (loadError) {
    return (
      <div className="view-fade">
        <div className="empty-state">
          <h3>Não foi possível carregar as configurações</h3>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  if (!registry) {
    return <div className="view-fade"><div className="empty-state"><h3>Carregando configurações...</h3></div></div>;
  }

  const Painel = selected ? PAINEIS[`${selected.ambiente}:${selected.modulo}`] : null;

  // Ambiente com um único módulo não precisa repetir o próprio nome no
  // breadcrumb ("Visão Geral / Parâmetros gerais" vira só "Parâmetros
  // gerais") — só ambientes com vários módulos (Estoque) mostram os 2 níveis.
  const ambienteAtual = selected ? registry.find(a => a.key === selected.ambiente) : null;
  const mostrarAmbiente = (ambienteAtual?.modulos.length ?? 0) > 1;

  return (
    <div className="view-fade">
      <div className="config-shell">
        <ConfigNav ambientes={registry} selected={selected} onSelect={setSelected} />

        <div className="config-content">
          {/* Dentro de .config-content (a mesma coluna dos painéis/abas) —
              antes ficava acima de .config-shell, largura cheia da página,
              e desalinhava com as abas do painel (que começam depois da
              coluna do ConfigNav). Agora os dois começam no mesmo x. */}
          <div className="config-breadcrumb">
            {selected ? (
              <>
                {mostrarAmbiente && (
                  <>
                    <span>{selected.ambienteLabel}</span>
                    <span className="config-breadcrumb-sep">/</span>
                  </>
                )}
                <span>{selected.label}</span>
              </>
            ) : (
              <span>Configurações</span>
            )}
          </div>

          {!selected && (
            <EmptyState
              title="Escolha uma área ao lado"
              message="Clique num ambiente na barra lateral pra abrir a lista de módulos e ver os parâmetros disponíveis."
            />
          )}
          {selected && (Painel ? (
            <Painel />
          ) : (
            <EmptyState
              title={`${selected.label} — parâmetros pendentes`}
              message="Ainda não há parâmetros configuráveis para este ambiente. Assim que as regras de negócio forem definidas com o time, esta área é liberada aqui — sem precisar mexer em código."
            />
          ))}
        </div>
      </div>
    </div>
  );
}
