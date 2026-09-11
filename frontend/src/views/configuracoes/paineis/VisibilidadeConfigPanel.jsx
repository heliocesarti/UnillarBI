import { useEffect, useState } from 'react';
import { api } from '../../../api/client';
import SettingsRow from '../ui/SettingsRow';
import SegmentedToggle from '../ui/SegmentedToggle';

const VISIBILIDADE_OPTIONS = [
  { value: false, label: 'Visível' },
  { value: true, label: 'Oculta' },
];

// Rótulos e ordem idênticos a `SUBTABS` em views/estoque/Estoque.jsx —
// "ruptura" fica de fora da lista (trava de segurança no backend, nunca
// pode ser ocultada).
const SUBABAS = [
  { key: 'geral', label: 'Geral' },
  { key: 'sem-giro', label: 'Sem Giro' },
  { key: 'ultimo-estoque', label: 'Último no Estoque' },
  { key: 'inativo-compra', label: 'Inativo p/ compra' },
  { key: 'margem', label: 'Margem' },
  { key: 'excesso', label: 'Excesso' },
  { key: 'indisponivel', label: 'Indisponível' },
];

export default function VisibilidadeConfigPanel() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    api.getConfig()
      .then(all => {
        setCfg(all.visibilidade);
        setLoading(false);
      })
      .catch(e => {
        setLoadError(e.message);
        setLoading(false);
      });
  }, []);

  function toggleOculta(key, oculta) {
    setFeedback(null);
    setCfg(prev => {
      const atual = new Set(prev.estoque_subtabs_ocultas);
      if (oculta) atual.add(key); else atual.delete(key);
      return { ...prev, estoque_subtabs_ocultas: [...atual] };
    });
  }

  async function handleSalvar() {
    setSaving(true);
    setFeedback(null);
    try {
      const salvo = await api.updateVisibilidadeConfig(cfg);
      setCfg(salvo);
      setFeedback({ tone: 'ok', text: 'Salvo. As sub-abas ocultas já saem do menu de Estoque na próxima vez que a tela carregar (F5).' });
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
      const padrao = await api.resetVisibilidadeConfig();
      setCfg(padrao);
      setFeedback({ tone: 'ok', text: 'Restaurado — todas as sub-abas voltam a ficar visíveis.' });
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
          <SettingsRow label="Ruptura" help="Nunca pode ser ocultada — é a análise principal da tela.">
            <span className="config-status-badge">Sempre visível</span>
          </SettingsRow>

          {SUBABAS.map(s => (
            <SettingsRow key={s.key} label={s.label} help="Oculta tira a sub-aba do menu de Estoque, sem apagar nada — o dado e a lógica continuam intactos, só ficam fora da navegação enquanto estiver oculta.">
              <SegmentedToggle
                value={cfg.estoque_subtabs_ocultas.includes(s.key)}
                options={VISIBILIDADE_OPTIONS}
                onChange={(v) => toggleOculta(s.key, v)}
              />
            </SettingsRow>
          ))}
        </div>
      </div>

      <div className="settings-footer">
        {feedback && <span className={'settings-banner' + (feedback.tone === 'error' ? ' is-error' : '')}>{feedback.text}</span>}
        <button className="icon-btn" disabled={saving} onClick={handleRestaurar}>Restaurar padrão (tudo visível)</button>
        <button className="icon-btn primary" disabled={saving} onClick={handleSalvar}>Salvar</button>
      </div>
    </>
  );
}
