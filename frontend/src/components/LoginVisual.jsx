import { useState } from 'react';

export function LoginVisual() {
  const [selectedRole, setSelectedRole] = useState('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState('');

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    const users = {
      admin: { username: 'admin', password: '1234' },
      cajero: { username: 'cajero', password: '1234' }
    };
    setUsername(users[role].username);
    setPassword(users[role].password);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('Demo visual: sin backend conectado');
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
                className={`role-btn ${selectedRole === 'admin' ? 'active' : ''}`}
                onClick={() => handleRoleChange('admin')}
              >
                Administrador
              </button>
              <button
                className={`role-btn ${selectedRole === 'cajero' ? 'active' : ''}`}
                onClick={() => handleRoleChange('cajero')}
              >
                Cajero
              </button>
            </div>

            <form id="loginForm" onSubmit={handleSubmit}>
              {error && (
                <div className="empty-state" style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}>
                  {error}
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
              <button type="submit" className="primary-btn full">Ingresar</button>
            </form>

            <div className="demo-box">
              <strong>Demo rapida</strong>
              <span>Admin: admin / 1234</span>
              <span>Cajero: cajero / 1234</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}