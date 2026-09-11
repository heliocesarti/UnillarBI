// `stack`: quando o controle tem muitos elementos (não cabe numa linha só
// ao lado do rótulo), empilha rótulo em cima e controle embaixo, sempre
// na largura cheia — em vez de deixar o rótulo espremer pra abrir espaço.
export default function SettingsRow({ label, help, children, stack = false }) {
  return (
    <div className={'settings-row' + (stack ? ' settings-row--stack' : '')}>
      <div className="settings-row-text">
        <div className="settings-row-label">{label}</div>
        {help && <div className="settings-row-help">{help}</div>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}
