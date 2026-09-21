import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { login as loginRequest, logout as logoutRequest, fetchCurrentUser } from '../services/authService';

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = 'web_kiosko_token';

// El backend maneja los roles como 'ADMIN' / 'CAJERO'; el resto de los
// componentes de este frontend ya esperan las etiquetas en español, así
// que se mapean acá una sola vez.
const ROL_A_ETIQUETA = {
  ADMIN: 'Administrador',
  CAJERO: 'Cajero',
};

function mapearUsuario({ username, nombre, rol, token }) {
  return {
    username,
    nombre,
    role: ROL_A_ETIQUETA[rol] || rol,
    token,
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('admin');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);

  // Al cargar la app, si hay un token guardado de una sesión anterior,
  // lo valida contra el backend en vez de asumir que sigue vigente.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    fetchCurrentUser(token)
      .then((usuario) => {
        setCurrentUser(mapearUsuario({ ...usuario, token }));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    setAuthError('');
    try {
      const data = await loginRequest(username, password);
      localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
      setCurrentUser(
        mapearUsuario({
          username,
          nombre: data.nombre,
          rol: data.rol,
          token: data.access_token,
        })
      );
      return true;
    } catch (err) {
      setAuthError(err.message || 'No se pudo iniciar sesión.');
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      logoutRequest(token).catch(() => {
        // Si falla la llamada al backend igual cerramos sesión en el front.
      });
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setCurrentUser(null);
  }, []);

  const value = {
    currentUser,
    selectedRole,
    setSelectedRole,
    login,
    logout,
    authError,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
