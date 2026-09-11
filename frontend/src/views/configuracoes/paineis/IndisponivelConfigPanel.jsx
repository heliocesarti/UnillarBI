import { useEffect, useState } from 'react';
import { api } from '../../../api/client';
import MultiSelectAccordion from '../ui/MultiSelectAccordion';

// Catálogo completo de locais existentes em z_dw_006.localestoqueproduto
// (conferido direto no banco, só leitura, em 27/08/2026) — permite montar
// a lista de cada categoria escolhendo visualmente, sem precisar acertar
// a grafia exata na mão.
const TODOS_OS_LOCAIS = [
  'ALMOXARIFADO [01]', 'ALMOXARIFADO [06]', 'ALMOXARIFADO [07]',
  'ASSIST TECNICA LJ P. DUTRA', 'ASSIT TEC AUTZDA [01]', 'ASSIT TEC DP [01]',
  'BALCAO ENTREGA CALCADOS [01]', 'CALÇADOS PROMOÇÃO [01]',
  'DEP ALFAVILE [01]', 'DEP CALÇADOS [01]', 'DEP LJ CEL SALA 01 [01]',
  'DEP LOJA MOV ELET [01]', 'DEP LOJA PNEUS [01]', 'DEP P. DUTRA [09]',
  'DEVOLUÇÃO [06]', 'DEVOLUÇÃO P. DUTRA [09]',
  'EMPRÉSTIMO', 'EMPRESTIMO [01]', 'EMPRESTIMO [06]', 'EMPRESTIMO P. DUTRA',
  'FORNECEDOR [01]', 'LOJA [01]', 'LOJA ESPERANTINOPOLIS', 'LOJA ITAIPAVA',
  'LOJA JENIPAPO DOS VIEIRAS', 'LOJA P. DUTRA [09]', 'OFICINA PIT STOP [01]',
  'PISOS DIVERSOS', 'PONTA DE ESTOQUE', 'PROMOÇÃO P. DUTRA [09]',
  'RESERVADO SORTEIOS [01]', 'SALDÃO DEP ALFAVILE [01]', 'SALDÃO ESPERANT [06]',
  'SEMI NOVO ALFAVILE [01]', 'SEMI NOVO ESPERANTINOPOLIS', 'SEMI NOVO ITAIPAVA',
  'SEMI NOVO JENIPAPO DOS VIEIRAS', 'SEMI NOVO LOJA [01]', 'SEMI NOVO P. DUTRA [09]',
  'TRIAGEM AVARIA/DEVOLUÇÃO[06]', 'UNIZAP [02]', 'V EX 01 [01]', 'V EX 03 [01]',
].map(local => ({ key: local, label: local }));

const CATEGORIAS = [
  { key: 'assistencia', label: 'Assistência', help: "Locais de assistência técnica (define a KPI 'Assistência')." },
  { key: 'almoxarifado', label: 'Almoxarifado', help: "Locais de almoxarifado (define a KPI 'Almoxarifado')." },
  { key: 'devolucao', label: 'Devolução', help: "Locais de devolução (define a KPI 'Devolução')." },
  { key: 'emprestimo', label: 'Empréstimo', help: "Locais de empréstimo (define a KPI 'Empréstimo')." },
];

export default function IndisponivelConfigPanel() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    api.getConfig()
      .then(all => {
        setCfg(all.indisponivel);
        setLoading(false);
      })
      .catch(e => {
        setLoadError(e.message);
        setLoading(false);
      });
  }, []);

  function updateCategoria(categoria, locais) {
    setFeedback(null);
    setCfg(prev => ({
      ...prev,
      locais_por_categoria: { ...prev.locais_por_categoria, [categoria]: locais },
    }));
  }

  async function handleSalvar() {
    setSaving(true);
    setFeedback(null);
    try {
      const salvo = await api.updateIndisponivelConfig(cfg);
      setCfg(salvo);
      setFeedback({ tone: 'ok', text: 'Configuração salva. Clique em "Atualizar dados" na tela Indisponível pra aplicar.' });
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
      const padrao = await api.resetIndisponivelConfig();
      setCfg(padrao);
      setFeedback({ tone: 'ok', text: 'Restaurado para o padrão.' });
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
      <div className="settings-section">
        <div className="settings-rows">
          {CATEGORIAS.map(c => (
            <MultiSelectAccordion
              key={c.key}
              label={`Locais de ${c.label}`}
              help={c.help}
              options={TODOS_OS_LOCAIS}
              selected={cfg.locais_por_categoria[c.key] ?? []}
              onChange={(v) => updateCategoria(c.key, v)}
            />
          ))}
        </div>
      </div>

      <div className="settings-footer">
        {feedback && <span className={'settings-banner' + (feedback.tone === 'error' ? ' is-error' : '')}>{feedback.text}</span>}
        <button className="icon-btn" disabled={saving} onClick={handleRestaurar}>Restaurar padrão</button>
        <button className="icon-btn primary" disabled={saving} onClick={handleSalvar}>Salvar</button>
      </div>
    </>
  );
}
