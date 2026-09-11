import { useEffect, useRef, useState } from 'react';
import { api } from '../../../api/client';
import { RANGES, FILIAIS } from '../../../constants/filtros';
import SettingsRow from '../ui/SettingsRow';
import SegmentedToggle from '../ui/SegmentedToggle';
import AccordionSelect from '../ui/AccordionSelect';
import MultiSelectAccordion from '../ui/MultiSelectAccordion';

const ChevronIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6" /></svg>
);
const CheckIcon = (
  <svg className="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg>
);

// Igual ao "MultiSelectAccordion", mas sem a linha (label+ajuda) própria —
// só a caixinha + menu flutuante, pra caber dentro de UMA linha junto com
// outros controles (flag de nível + qtd de palavras), em vez de virar um
// bloco/card separado.
// Remove acento pra busca não exigir digitar "ç"/"ã" certinho.
const normalizaBusca = (s) => s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');

function InlineMultiSelect({ options, selected, onChange, placeholder, width = 200 }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setBusca(''); }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const selecionadas = options.filter(o => selected.includes(o.key));
  const resumo = selecionadas.length === 0
    ? (placeholder || 'Selecionar')
    : selecionadas.length === options.length
      ? 'Todas selecionadas'
      : selecionadas.map(o => o.label).join(', ');

  function toggleOpcao(key) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(Array.from(next));
  }

  // Busca só aparece quando compensa (lista curta não precisa).
  const mostraBusca = options.length > 6;
  const buscaNorm = normalizaBusca(busca);
  const opcoesFiltradas = mostraBusca && buscaNorm
    ? options.filter(o => normalizaBusca(o.label).includes(buscaNorm))
    : options;

  return (
    <div className="settings-float-anchor" ref={ref}>
      <button type="button" className={'settings-row-current' + (open ? ' open' : '')} style={{ width }} onClick={() => setOpen(o => !o)}>
        <span>{resumo}</span>
        {ChevronIcon}
      </button>
      {open && (
        <div className="settings-float-menu inline-ms-menu">
          {mostraBusca && (
            <input
              type="text"
              autoFocus
              className="settings-float-search"
              placeholder="Pesquisar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="inline-ms-list">
            {options.length === 0 && <div className="settings-float-item" style={{ cursor: 'default' }}>Catálogo vazio</div>}
            {options.length > 0 && opcoesFiltradas.length === 0 && (
              <div className="settings-float-item" style={{ cursor: 'default' }}>Nenhum resultado</div>
            )}
            {opcoesFiltradas.map(o => (
              <button
                key={o.key}
                type="button"
                className={'settings-float-item' + (selected.includes(o.key) ? ' selected' : '')}
                onClick={() => toggleOpcao(o.key)}
              >
                {o.label}
                {CheckIcon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Grupos de parâmetros da Ruptura, exibidos como abas horizontais (mesmo
// padrão visual das sub-abas de Estoque). Acrescentar grupo novo no
// futuro é só adicionar uma entrada aqui + o bloco correspondente abaixo.
const GRUPOS = [
  { key: 'situacao', label: 'Situação' },
  { key: 'pedidos', label: 'Pedidos e Entradas' },
  { key: 'aglutinar', label: 'Aglutinar' },
  { key: 'tela', label: 'Padrões da tela' },
  { key: 'exportacao', label: 'Exportação' },
];

// Só esses dois grupos mexem na consulta pesada (compute_base) — os
// outros são lidos na hora (Aglutinar) ou são só preferência de tela
// (Padrões da tela / Exportação), então não precisam de "Atualizar dados".
const GRUPOS_PRECISAM_ATUALIZAR = new Set(['situacao', 'pedidos']);

const AI_OPTIONS = [
  { value: 'A', label: 'Ativo' },
  { value: 'I', label: 'Inativo' },
];

const LIGADO_OPTIONS = [
  { value: true, label: 'Ligado' },
  { value: false, label: 'Desligado' },
];

const MODO_PERIODO_OPTIONS = [
  { value: 'dias', label: 'Dias' },
  { value: 'mes_atual', label: 'Mês atual' },
  { value: 'ano_atual', label: 'Ano atual' },
  { value: 'livre', label: 'Livre' },
];

// Opções da janela de Pendente Entrada/Pedido Pendente — presets fixos
// (não "digite os dias" como o de Vendas acima) porque foi assim que o
// usuário pediu. "livre" usa as mesmas 2 datas do padrão de vendas.
const PERIODO_PENDENTE_OPTIONS = [
  { key: '30', label: 'Último mês' },
  { key: '90', label: 'Últimos 3 meses' },
  { key: '270', label: 'Últimos 9 meses' },
  { key: '365', label: 'Último ano' },
  { key: 'livre', label: 'Livre' },
];

const SEPARADOR_OPTIONS = [
  { key: ';', label: 'Ponto e vírgula ( ; ) — padrão BR' },
  { key: ',', label: 'Vírgula ( , ) — padrão internacional' },
];

// Valores reais existentes em z_dw_026_capas/z_dw_029_itens (conferidos
// direto no banco, só leitura) — não são digitados livremente pra evitar
// erro de digitação que faria o filtro silenciosamente não bater nada.
const SITUACAO_OPTIONS = [
  { key: 'PENDENTE', label: 'Pendente' },
  { key: 'BAIXADO', label: 'Baixado' },
  { key: 'CANCELADO', label: 'Cancelado' },
  { key: '?', label: '? (sem classificação)' },
];

const OPERACAO_OPTIONS = [
  { key: 'Entrada por COMPRA', label: 'Entrada por Compra' },
  { key: 'Entrada por BONIFICAÇÃO', label: 'Entrada por Bonificação' },
  { key: 'Entrada por DEVOLUÇÃO', label: 'Entrada por Devolução' },
  { key: 'Entrada por TRANSFERÊNCIA', label: 'Entrada por Transferência' },
  { key: 'Entrada de Nota de Saída', label: 'Entrada de Nota de Saída' },
  { key: 'Outras Entradas', label: 'Outras Entradas' },
  { key: 'INDEFINIDO', label: 'Indefinido' },
];

const SITUACAO_PEDIDO_OPTIONS = [
  { key: 'NÃO ENTREGUE', label: 'Não entregue' },
  { key: 'PARCIAL', label: 'Parcial' },
  { key: 'ENTREGUE', label: 'Entregue' },
  { key: 'CANCELADO', label: 'Cancelado' },
];

// 3 "flags" (segmented toggle) pra escolher o nível da exceção.
const NIVEL_EXCECAO_OPTIONS = [
  { value: 'departamento', label: 'Departamento' },
  { value: 'grupo', label: 'Grupo' },
  { value: 'subgrupo', label: 'Subgrupo' },
];

// Nível da exceção -> chave da resposta de `getRupturaClassificacoes`.
const CATALOGO_POR_NIVEL = { departamento: 'departamentos', grupo: 'grupos', subgrupo: 'subgrupos' };

const RISCO_OPTIONS = [
  { key: 'ruptura', label: 'Ruptura' },
  { key: 'emergencia', label: 'Emergência' },
  { key: 'urgencia', label: 'Urgência' },
  { key: 'alta', label: 'Alta' },
  { key: 'media', label: 'Média' },
  { key: 'sem-risco', label: 'Sem risco' },
];

const COLUNA_EXPORT_OPTIONS = [
  { key: 'cod', label: 'Código' },
  { key: 'desc', label: 'Descrição' },
  { key: 'marca', label: 'Marca' },
  { key: 'vendas', label: 'Total vendas' },
  { key: 'estoque', label: 'Estoque atual' },
  { key: 'entrada', label: 'Entradas pendentes' },
  { key: 'pedidos', label: 'Pedidos pendentes' },
  { key: 'diasPedidosPend', label: 'Dias atraso pedido' },
  { key: 'diasPendEntrada', label: 'Dias atraso entrada' },
  { key: 'projecao', label: 'Projeção' },
  { key: 'departamento', label: 'Departamento' },
  { key: 'grupo', label: 'Grupo' },
  { key: 'subgrupo', label: 'Subgrupo' },
  { key: 'risco', label: 'Ruptura' },
];

export default function RupturaConfigPanel() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [grupoAtivo, setGrupoAtivo] = useState('situacao');
  // Catálogo real de Departamento/Grupo/Subgrupo pras exceções do
  // Aglutinar (múltipla escolha) — vem da base já cacheada da Ruptura.
  // Se ainda não tiver rodado "Atualizar dados" na Ruptura nenhuma vez,
  // volta listas vazias (avisado no texto de ajuda abaixo).
  const [classificacoes, setClassificacoes] = useState({ departamentos: [], grupos: [], subgrupos: [] });
  // Busca + paginação da lista de exceções do Aglutinar (só estado de
  // tela, não vai pro cfg salvo) — evita a lista virar uma parede
  // conforme cresce, sem mudar o formato de cada linha (continua sempre
  // expandida, igual sempre foi).
  const [buscaExcecao, setBuscaExcecao] = useState('');
  const [paginaExcecao, setPaginaExcecao] = useState(1);
  const EXCECOES_POR_PAGINA = 5;

  useEffect(() => {
    api.getConfig()
      .then(all => {
        setCfg(all.ruptura);
        setLoading(false);
      })
      .catch(e => {
        setLoadError(e.message);
        setLoading(false);
      });
    api.getRupturaClassificacoes().then(setClassificacoes).catch(() => {});
  }, []);

  function update(patch) {
    setFeedback(null);
    setCfg(prev => ({ ...prev, ...patch }));
  }

  function updatePeriodo(patch) {
    setFeedback(null);
    setCfg(prev => ({ ...prev, vendas_periodo: { ...prev.vendas_periodo, ...patch } }));
  }

  function updateEntradaPeriodo(patch) {
    setFeedback(null);
    setCfg(prev => ({ ...prev, entrada_periodo: { ...prev.entrada_periodo, ...patch } }));
  }

  function updatePedidoPeriodo(patch) {
    setFeedback(null);
    setCfg(prev => ({ ...prev, pedido_periodo: { ...prev.pedido_periodo, ...patch } }));
  }

  function addExcecaoAglutinar() {
    setFeedback(null);
    setBuscaExcecao(''); // sem isso a exceção nova podia nascer escondida por uma busca ativa
    setCfg(prev => ({
      ...prev,
      aglutinar_prefixo_excecoes: [
        ...prev.aglutinar_prefixo_excecoes,
        { nivel: 'grupo', valores: [], palavras: prev.aglutinar_prefixo_palavras },
      ],
    }));
    // Nova exceção entra no fim da lista — pula pra última página pra
    // aparecer na tela sem precisar navegar até lá.
    setPaginaExcecao(Math.ceil((cfg.aglutinar_prefixo_excecoes.length + 1) / EXCECOES_POR_PAGINA));
  }

  function updateExcecaoAglutinar(idx, patch) {
    setFeedback(null);
    setCfg(prev => ({
      ...prev,
      aglutinar_prefixo_excecoes: prev.aglutinar_prefixo_excecoes.map((e, i) => i === idx ? { ...e, ...patch } : e),
    }));
  }

  function removeExcecaoAglutinar(idx) {
    setFeedback(null);
    setCfg(prev => ({
      ...prev,
      aglutinar_prefixo_excecoes: prev.aglutinar_prefixo_excecoes.filter((_, i) => i !== idx),
    }));
  }

  async function handleSalvar() {
    setSaving(true);
    setFeedback(null);
    try {
      const salvo = await api.updateRupturaConfig(cfg);
      setCfg(salvo);
      setFeedback({
        tone: 'ok',
        text: GRUPOS_PRECISAM_ATUALIZAR.has(grupoAtivo)
          ? 'Configuração salva. Clique em "Atualizar dados" na tela Ruptura pra aplicar.'
          : 'Configuração salva e já aplicada — vale a partir do próximo carregamento da tela.',
      });
    } catch (e) {
      setFeedback({ tone: 'error', text: `Erro ao salvar: ${e.message}` });
    } finally {
      setSaving(false);
    }
  }

  async function handleRestaurar() {
    setSaving(true);
    setFeedback(null);
    try {
      const padrao = await api.resetRupturaConfig();
      setCfg(padrao);
      setFeedback({ tone: 'ok', text: 'Restaurado para o padrão (igual à regra original do Power BI).' });
    } catch (e) {
      setFeedback({ tone: 'error', text: `Erro ao restaurar: ${e.message}` });
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="empty-state">
        <h3>Não foi possível carregar a configuração</h3>
        <p>{loadError}</p>
      </div>
    );
  }

  if (loading || !cfg) {
    return <div className="empty-state"><h3>Carregando configuração...</h3></div>;
  }

  return (
    <>
      <div className="subtabs config-subtabs">
        {GRUPOS.map(g => (
          <button
            key={g.key}
            className={'subtab' + (grupoAtivo === g.key ? ' active' : '')}
            onClick={() => setGrupoAtivo(g.key)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {grupoAtivo === 'situacao' && (
        <div className="settings-section">
          <div className="settings-rows">
            <AccordionSelect
              label="Situação da entrada"
              help="Quais notas contam como 'a caminho'."
              options={SITUACAO_OPTIONS}
              selectedKey={cfg.situacao_entrada}
              onSelect={(key) => update({ situacao_entrada: key })}
            />

            <AccordionSelect
              label="Operação de entrada"
              help="Tipo de operação considerado válido."
              options={OPERACAO_OPTIONS}
              selectedKey={cfg.operacao_entrada}
              onSelect={(key) => update({ operacao_entrada: key })}
            />

            <SettingsRow label="Produto permite compra" help="Trava de elegibilidade no cadastro.">
              <SegmentedToggle value={cfg.permitecompra} options={AI_OPTIONS} onChange={(v) => update({ permitecompra: v })} />
            </SettingsRow>

            <SettingsRow label="Produto permite venda" help="Mesma trava, lado da venda.">
              <SegmentedToggle value={cfg.permitevenda} options={AI_OPTIONS} onChange={(v) => update({ permitevenda: v })} />
            </SettingsRow>

            <SettingsRow label="Status do cadastro" help="Terceira trava, status geral do produto.">
              <SegmentedToggle value={cfg.pro_status} options={AI_OPTIONS} onChange={(v) => update({ pro_status: v })} />
            </SettingsRow>
          </div>
        </div>
      )}

      {grupoAtivo === 'pedidos' && (
        <div className="settings-section">
          <div className="settings-rows">
            <MultiSelectAccordion
              label="Situações de pedido consideradas pendentes"
              help="Quais status de item contam como 'a caminho'."
              options={SITUACAO_PEDIDO_OPTIONS}
              selected={cfg.situacoes_pedido_pendente}
              onChange={(v) => update({ situacoes_pedido_pendente: v })}
            />

            <SettingsRow label="Janela de histórico de vendas" help="Quanto tempo pra trás a atualização de dados busca vendas.">
              <SegmentedToggle value={cfg.vendas_periodo.modo} options={MODO_PERIODO_OPTIONS} onChange={(v) => updatePeriodo({ modo: v })} />
            </SettingsRow>

            {cfg.vendas_periodo.modo === 'dias' && (
              <SettingsRow label="Quantidade de dias" help="Só usado quando a janela acima está em 'Dias'.">
                <input
                  type="number" min="1" className="config-input" style={{ width: 90, textAlign: 'center' }}
                  value={cfg.vendas_periodo.dias ?? ''}
                  onChange={(e) => updatePeriodo({ dias: Number(e.target.value) || 1 })}
                />
              </SettingsRow>
            )}

            {cfg.vendas_periodo.modo === 'livre' && (
              <SettingsRow label="Data inicial / final" help="Intervalo fixo de vendas — data final vazia conta como hoje.">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" className="config-input" value={cfg.vendas_periodo.data_inicio ?? ''} onChange={(e) => updatePeriodo({ data_inicio: e.target.value })} />
                  <input type="date" className="config-input" value={cfg.vendas_periodo.data_fim ?? ''} onChange={(e) => updatePeriodo({ data_fim: e.target.value || null })} />
                </div>
              </SettingsRow>
            )}

            <AccordionSelect
              label="Janela de Pendente Entrada"
              help="Só conta nota de entrada pendente emitida dentro desse período — padrão 1 ano."
              options={PERIODO_PENDENTE_OPTIONS}
              selectedKey={cfg.entrada_periodo.modo === 'livre' ? 'livre' : String(cfg.entrada_periodo.dias)}
              onSelect={(key) => key === 'livre' ? updateEntradaPeriodo({ modo: 'livre' }) : updateEntradaPeriodo({ modo: 'dias', dias: Number(key) })}
            />

            {cfg.entrada_periodo.modo === 'livre' && (
              <SettingsRow label="Data inicial / final (entrada)" help="Intervalo fixo — data final vazia conta como hoje.">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" className="config-input" value={cfg.entrada_periodo.data_inicio ?? ''} onChange={(e) => updateEntradaPeriodo({ data_inicio: e.target.value })} />
                  <input type="date" className="config-input" value={cfg.entrada_periodo.data_fim ?? ''} onChange={(e) => updateEntradaPeriodo({ data_fim: e.target.value || null })} />
                </div>
              </SettingsRow>
            )}

            <AccordionSelect
              label="Janela de Pedido Pendente"
              help="Só conta pedido de compra pendente emitido dentro desse período — padrão 1 ano."
              options={PERIODO_PENDENTE_OPTIONS}
              selectedKey={cfg.pedido_periodo.modo === 'livre' ? 'livre' : String(cfg.pedido_periodo.dias)}
              onSelect={(key) => key === 'livre' ? updatePedidoPeriodo({ modo: 'livre' }) : updatePedidoPeriodo({ modo: 'dias', dias: Number(key) })}
            />

            {cfg.pedido_periodo.modo === 'livre' && (
              <SettingsRow label="Data inicial / final (pedido)" help="Intervalo fixo — data final vazia conta como hoje.">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" className="config-input" value={cfg.pedido_periodo.data_inicio ?? ''} onChange={(e) => updatePedidoPeriodo({ data_inicio: e.target.value })} />
                  <input type="date" className="config-input" value={cfg.pedido_periodo.data_fim ?? ''} onChange={(e) => updatePedidoPeriodo({ data_fim: e.target.value || null })} />
                </div>
              </SettingsRow>
            )}
          </div>
        </div>
      )}

      {grupoAtivo === 'aglutinar' && (
        <div className="settings-section">
          <div className="settings-rows">
            <SettingsRow label="Ligado por padrão ao abrir a tela" help="Só preferência de tela — não muda nenhum cálculo.">
              <SegmentedToggle value={cfg.aglutinar_ligado_por_padrao} options={LIGADO_OPTIONS} onChange={(v) => update({ aglutinar_ligado_por_padrao: v })} />
            </SettingsRow>

            <SettingsRow label="Palavras usadas pra reconhecer 'mesmo produto'" help="Valor global. Ex.: 3 junta 'TIJOLO 8 FUROS [marca]' de marcas diferentes. Mexa com cuidado.">
              <input
                type="number" min="1" max="6" className="config-input" style={{ width: 80, textAlign: 'center' }}
                value={cfg.aglutinar_prefixo_palavras}
                onChange={(e) => update({ aglutinar_prefixo_palavras: Number(e.target.value) || 1 })}
              />
            </SettingsRow>
          </div>

          <div className="settings-subsection">
            {cfg.aglutinar_prefixo_excecoes.length > EXCECOES_POR_PAGINA && (
              <input
                type="text"
                className="settings-float-search rup-excecao-busca"
                placeholder="Pesquisar exceção por departamento, grupo ou subgrupo..."
                value={buscaExcecao}
                onChange={(e) => { setBuscaExcecao(e.target.value); setPaginaExcecao(1); }}
              />
            )}

            {(() => {
              const comIndice = cfg.aglutinar_prefixo_excecoes.map((exc, idx) => ({ exc, idx }));
              const buscaNorm = normalizaBusca(buscaExcecao);
              const filtradas = buscaNorm
                ? comIndice.filter(({ exc }) => {
                    const nivelLabel = NIVEL_EXCECAO_OPTIONS.find(o => o.value === exc.nivel)?.label ?? exc.nivel;
                    return normalizaBusca(`${nivelLabel} ${exc.valores.join(' ')}`).includes(buscaNorm);
                  })
                : comIndice;
              const totalPaginas = Math.max(1, Math.ceil(filtradas.length / EXCECOES_POR_PAGINA));
              const paginaAtual = Math.min(paginaExcecao, totalPaginas);
              const doPagina = filtradas.slice((paginaAtual - 1) * EXCECOES_POR_PAGINA, paginaAtual * EXCECOES_POR_PAGINA);

              return (
                <>
                  {filtradas.length === 0 && (
                    <div className="settings-row" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {cfg.aglutinar_prefixo_excecoes.length === 0 ? 'Nenhuma exceção cadastrada.' : 'Nenhuma exceção encontrada pra essa busca.'}
                    </div>
                  )}

                  {doPagina.map(({ exc, idx }) => {
                    const opcoesValores = (classificacoes[CATALOGO_POR_NIVEL[exc.nivel]] || []).map(v => ({ key: v, label: v }));
                    return (
                      <div key={idx} className="settings-row settings-row--stack">
                        <div className="settings-row-control" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <SegmentedToggle
                            value={exc.nivel}
                            options={NIVEL_EXCECAO_OPTIONS}
                            onChange={(v) => updateExcecaoAglutinar(idx, { nivel: v, valores: [] })}
                          />
                          <InlineMultiSelect
                            options={opcoesValores}
                            selected={exc.valores}
                            onChange={(v) => updateExcecaoAglutinar(idx, { valores: v })}
                            placeholder="Selecionar"
                          />
                          <input
                            type="number" min="1" max="6" className="config-input" style={{ width: 56, minWidth: 56, textAlign: 'center' }}
                            title="Qtd. de palavras"
                            value={exc.palavras}
                            onChange={(e) => updateExcecaoAglutinar(idx, { palavras: Number(e.target.value) || 1 })}
                          />
                          <span className="settings-exception-hint">palavras</span>
                          <button type="button" className="icon-btn" onClick={() => removeExcecaoAglutinar(idx)}>Remover</button>
                        </div>
                      </div>
                    );
                  })}

                  {totalPaginas > 1 && (
                    <div className="rup-excecao-paginacao">
                      <span className="rup-excecao-paginacao-info">{filtradas.length} exceç{filtradas.length === 1 ? 'ão' : 'ões'}</span>
                      <div className="rup-excecao-paginacao-botoes">
                        <button type="button" className="icon-btn" disabled={paginaAtual === 1} onClick={() => setPaginaExcecao(paginaAtual - 1)}>‹ Anterior</button>
                        <span className="rup-excecao-paginacao-num">{paginaAtual} / {totalPaginas}</span>
                        <button type="button" className="icon-btn" disabled={paginaAtual === totalPaginas} onClick={() => setPaginaExcecao(paginaAtual + 1)}>Próxima ›</button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            <button type="button" className="icon-btn" onClick={addExcecaoAglutinar} style={{ marginTop: 10 }}>+ Adicionar exceção</button>
          </div>
        </div>
      )}

      {grupoAtivo === 'tela' && (
        <div className="settings-section">
          <div className="settings-rows">
            <AccordionSelect
              label="Filtro de dias padrão"
              help="Selecionado automaticamente ao abrir a Ruptura."
              options={RANGES}
              selectedKey={cfg.tela_dias_padrao}
              onSelect={(key) => update({ tela_dias_padrao: key })}
            />

            <AccordionSelect
              label="Filial usada nos cálculos"
              help="A tela de Ruptura não tem mais seletor de filial — esse é o único jeito de mudar isso."
              options={FILIAIS}
              selectedKey={cfg.tela_filial_padrao}
              onSelect={(key) => update({ tela_filial_padrao: key })}
            />

            <MultiSelectAccordion
              label="Classificações de risco marcadas por padrão"
              help="Quais ficam ativas no dropdown ao abrir a tela."
              options={RISCO_OPTIONS}
              selected={cfg.tela_riscos_padrao}
              onChange={(v) => update({ tela_riscos_padrao: v })}
            />

            <SettingsRow label="Corte do rótulo nos gráficos" help="Caracteres antes de cortar com '…' em Departamento/Grupo.">
              <input
                type="number" min="1" max="40" className="config-input" style={{ width: 80, textAlign: 'center' }}
                value={cfg.grafico_truncar_rotulo}
                onChange={(e) => update({ grafico_truncar_rotulo: Number(e.target.value) || 1 })}
              />
            </SettingsRow>
          </div>
        </div>
      )}

      {grupoAtivo === 'exportacao' && (
        <div className="settings-section">
          <div className="settings-rows">
            <AccordionSelect
              label="Separador do CSV"
              help="';' é o padrão do Excel em português; ',' é o padrão internacional."
              options={SEPARADOR_OPTIONS}
              selectedKey={cfg.export_separador_csv}
              onSelect={(key) => update({ export_separador_csv: key })}
            />

            <MultiSelectAccordion
              label="Colunas exportadas"
              help="Quais colunas saem no Excel/CSV."
              options={COLUNA_EXPORT_OPTIONS}
              selected={cfg.export_colunas}
              onChange={(v) => update({ export_colunas: v })}
            />
          </div>
        </div>
      )}

      <div className="settings-footer">
        {feedback && <span className={'settings-banner' + (feedback.tone === 'error' ? ' is-error' : '')}>{feedback.text}</span>}
        <button className="icon-btn" disabled={saving} onClick={handleRestaurar}>Restaurar padrão</button>
        <button className="icon-btn primary" disabled={saving} onClick={handleSalvar}>Salvar</button>
      </div>
    </>
  );
}
