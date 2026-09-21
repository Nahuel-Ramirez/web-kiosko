import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Credenciales de los usuarios sembrados por backend/app/db/seed.py
const USUARIOS_DEMO = {
  admin: { username: 'admin', password: 'admin123' },
  cajero: { username: 'cajero', password: 'cajero123' },
};

export function Login() {
  const { selectedRole, setSelectedRole, login, authError } = useAuth();
  const [username, setUsername] = useState(USUARIOS_DEMO.admin.username);
  const [password, setPassword] = useState(USUARIOS_DEMO.admin.password);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await login(username.trim(), password.trim());
    setSubmitting(false);
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setUsername(USUARIOS_DEMO[role].username);
    setPassword(USUARIOS_DEMO[role].password);
  };

  return (
    <div id="loginView" className="screen active">
      <div className="login-shell">
        <div className="brand-panel">
          <span className="eyebrow">Sistema de ventas</span>
          <h1>Web Kiosko</h1>
          <p>Panel de administracion y punto de venta para kiosco y minimarket.</p>
        </div>

        <div className="login-card">
          <div>
            <h2>Iniciar sesion</h2>
            <div className="role-toggle">
              <button
                type="button"
                className={`role-btn ${selectedRole === 'admin' ? 'active' : ''}`}
                onClick={() => handleRoleChange('admin')}
              >
                Administrador
              </button>
              <button
                type="button"
                className={`role-btn ${selectedRole === 'cajero' ? 'active' : ''}`}
                onClick={() => handleRoleChange('cajero')}
              >
                Cajero
              </button>
            </div>

            <form id="loginForm" onSubmit={handleSubmit}>
              {authError && (
                <div className="empty-state" style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}>
                  {authError}
                </div>
              )}
              <label>
                Usuario
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="usuario"
                  required
                />
              </label>
              <label>
                Contrasena
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="****"
                  required
                />
              </label>
              <button type="submit" className="primary-btn full" disabled={submitting}>
                {submitting ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>

            <div className="demo-box">
              <strong>Usuarios de prueba (backend)</strong>
              <span>Admin: admin / admin123</span>
              <span>Cajero: cajero / cajero123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
