import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function Configuracoes() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

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
  }, []);

  function update(patch) {
    setCfg(prev => ({ ...prev, ...patch }));
  }

  async function handleSalvar(atualizarDepois) {
    setSaving(true);
    setFeedback(null);
    try {
      const salvo = await api.updateRupturaConfig(cfg);
      setCfg(salvo);
      if (atualizarDepois) {
        await api.atualizarEstoqueRuptura();
        setFeedback('Configuração salva. Atualização de dados iniciada — acompanhe na tela Ruptura.');
      } else {
        setFeedback('Configuração salva. Vale a partir da próxima vez que clicar em "Atualizar dados" na Ruptura.');
      }
    } catch (e) {
      setFeedback(`Erro ao salvar: ${e.message}`);
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
      setFeedback('Restaurado para o padrão (igual à regra original do Power BI).');
    } catch (e) {
      setFeedback(`Erro ao restaurar: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="view-fade">
        <div className="empty-state">
          <h3>Não foi possível carregar a configuração</h3>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  if (loading || !cfg) {
    return <div className="view-fade"><div className="empty-state"><h3>Carregando configuração...</h3></div></div>;
  }

  return (
    <div className="view-fade">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Ruptura — situação e elegibilidade das consultas</div>
        <div className="card-subtitle">
          Controla quais registros a atualização de dados considera no banco. Mudanças só valem a
          partir da próxima vez que clicar em "Atualizar dados" na tela Ruptura. Os limites de
          atraso e a fórmula de classificação de risco agora seguem exatamente a mesma regra do
          Power BI e não são mais editáveis por aqui.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 14 }}>Situação</div>
        <div className="config-grid">
          <div className="config-field">
            <label className="config-label">Situação da entrada (nota fiscal)</label>
            <input className="config-input" value={cfg.situacao_entrada} onChange={(e) => update({ situacao_entrada: e.target.value })} />
          </div>
          <div className="config-field">
            <label className="config-label">Operação de entrada</label>
            <input className="config-input" value={cfg.operacao_entrada} onChange={(e) => update({ operacao_entrada: e.target.value })} />
          </div>
          <div className="config-field">
            <label className="config-label">Produto permite compra</label>
            <select className="config-input" value={cfg.permitecompra} onChange={(e) => update({ permitecompra: e.target.value })}>
              <option value="A">Ativo (A)</option>
              <option value="I">Inativo (I)</option>
            </select>
          </div>
          <div className="config-field">
            <label className="config-label">Produto permite venda</label>
            <select className="config-input" value={cfg.permitevenda} onChange={(e) => update({ permitevenda: e.target.value })}>
              <option value="A">Ativo (A)</option>
              <option value="I">Inativo (I)</option>
            </select>
          </div>
          <div className="config-field">
            <label className="config-label">Status do cadastro (pro_status)</label>
            <select className="config-input" value={cfg.pro_status} onChange={(e) => update({ pro_status: e.target.value })}>
              <option value="A">Ativo (A)</option>
              <option value="I">Inativo (I)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="config-actions">
        <button className="icon-btn" disabled={saving} onClick={() => handleSalvar(false)}>Salvar</button>
        <button className="icon-btn primary" disabled={saving} onClick={() => handleSalvar(true)}>Salvar e atualizar agora</button>
        <button className="icon-btn" disabled={saving} onClick={handleRestaurar}>Restaurar padrão</button>
        {feedback && <span className="config-feedback">{feedback}</span>}
      </div>
    </div>
  );
}
