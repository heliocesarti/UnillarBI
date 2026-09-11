import { useState } from 'react';
import SettingsRow from '../ui/SettingsRow';
import SegmentedToggle from '../ui/SegmentedToggle';
import { getTelaInicial, setTelaInicial } from '../../../utils/telaInicial';

const TELA_OPTIONS = [
  { value: 'visao-geral', label: 'Visão Geral' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'estoque', label: 'Estoque (Ruptura)' },
  { value: 'financeiro', label: 'Financeiro' },
];

// Preferência pessoal de quem está usando a tela — fica salva só no
// navegador (localStorage), igual o tema em AparenciaConfigPanel. Vale a
// partir do próximo carregamento (F5/reabrir).
export default function TelaInicialConfigPanel() {
  const [tela, setTela] = useState(getTelaInicial);

  function escolher(valor) {
    setTela(valor);
    setTelaInicial(valor);
  }

  return (
    <div className="settings-section">
      <div className="settings-rows">
        <SettingsRow
          label="Tela inicial"
          help="Ambiente que abre ao carregar o sistema. Vale a partir do próximo carregamento (F5/reabrir). Estoque já abre direto na Ruptura."
        >
          <SegmentedToggle value={tela} options={TELA_OPTIONS} onChange={escolher} />
        </SettingsRow>
      </div>
    </div>
  );
}
