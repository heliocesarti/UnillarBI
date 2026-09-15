import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

const EyeIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" /></svg>;
const EyeOffIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l18 18" /><path d="M10.6 5.1A10.7 10.7 0 0112 5c7 0 10.5 7 10.5 7a13.4 13.4 0 01-3.2 4.1M6.5 6.6C3.4 8.6 1.5 12 1.5 12S5 19 12 19a10.6 10.6 0 004.1-.8" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /></svg>;
const LockIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>;
const UserIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>;

export default function Login() {
  const { login } = useAuth();
  const [loginValue, setLoginValue] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!loginValue.trim() || !senha) return;
    setErro('');
    setEnviando(true);
    try {
      await login(loginValue.trim().toLowerCase(), senha);
    } catch (err) {
      setErro(err.message || 'Nao foi possivel entrar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-glow" />
      <div className="login-card">
        <div className="login-brand">
          <img src="/logo.png" alt="Unillar" />
          <div>
            <b>Unillar BI</b>
            <span>Painel de Análises</span>
          </div>
        </div>

        <div className="login-heading">
          <h1>Entrar</h1>
          <p>Acesse com o usuário e a senha fornecidos pela TI.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span className="login-label">Usuário</span>
            <div className="login-input-wrap">
              <span className="login-input-icon">{UserIcon}</span>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                placeholder="seu.usuario"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
              />
            </div>
          </label>

          <label className="login-field">
            <span className="login-label">Senha</span>
            <div className="login-input-wrap">
              <span className="login-input-icon">{LockIcon}</span>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button
                type="button"
                className="login-toggle-senha"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? EyeOffIcon : EyeIcon}
              </button>
            </div>
          </label>

          {erro && <div className="login-erro">{erro}</div>}

          <button type="submit" className="login-submit" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-footer">Unillar BI © 2026 · Acesso restrito à equipe autorizada</div>
      </div>
    </div>
  );
}
