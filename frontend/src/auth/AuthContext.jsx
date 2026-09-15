import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from '../api/client';

const TOKEN_KEY = 'unillarbi_token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setCarregando(false);
      return;
    }
    setAuthToken(token);
    api.me()
      .then(setUsuario)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
      })
      .finally(() => setCarregando(false));
  }, []);

  async function login(loginValue, senha) {
    const { token, usuario: u } = await api.login(loginValue, senha);
    localStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    setUsuario(u);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout, isAdmin: usuario?.papel === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
