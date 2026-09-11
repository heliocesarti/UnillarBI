import { useState } from 'react';
import SettingsRow from '../ui/SettingsRow';
import SegmentedToggle from '../ui/SegmentedToggle';
import { getTheme, setTheme } from '../../../utils/theme';

const TEMA_OPTIONS = [
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
];

// Preferência pessoal de quem está vendo a tela — fica salva só no
// navegador (localStorage), não no servidor: cada operador escolhe o
// próprio tema, sem afetar os outros. Aplica na hora, sem precisar salvar.
export default function AparenciaConfigPanel() {
  const [tema, setTema] = useState(getTheme);

  function escolher(valor) {
    setTema(valor);
    setTheme(valor);
  }

  return (
    <div className="settings-section">
      <div className="settings-rows">
        <SettingsRow label="Tema da tela" help="Aplica na hora, em toda a tela. Fica salvo neste navegador.">
          <SegmentedToggle value={tema} options={TEMA_OPTIONS} onChange={escolher} />
        </SettingsRow>
      </div>
    </div>
  );
}
