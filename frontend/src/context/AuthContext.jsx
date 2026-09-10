import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const users = {
  admin: { username: 'admin', password: '1234', role: 'Administrador' },
  cajero: { username: 'cajero', password: '1234', role: 'Cajero' }
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('admin');

  const login = useCallback((username, password) => {
    const selected = users[selectedRole];
    if (!selected || username !== selected.username || password !== selected.password) {
      return false;
    }
    setCurrentUser({ username, role: selected.role });
    return true;
  }, [selectedRole]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const value = {
    currentUser,
    selectedRole,
    setSelectedRole,
    login,
    logout
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