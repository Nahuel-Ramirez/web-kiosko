import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { solicitarCambioPassword } from '../services/authService';

const USUARIOS_DEMO = {
  admin: { username: 'admin', password: 'admin123' },
  cajero: { username: 'cajero', password: 'cajero123' },
};

export function Login() {
  const { selectedRole, setSelectedRole, login, authError } = useAuth();
  const { formatMoney } = useApp();
  const [username, setUsername] = useState(USUARIOS_DEMO.admin.username);
  const [password, setPassword] = useState(USUARIOS_DEMO.admin.password);
  const [submitting, setSubmitting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetForm, setResetForm] = useState({
    username: '',
    justificacion: ''
  });
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

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

  const openResetModal = (e) => {
    e.preventDefault();
    setShowResetModal(true);
    setResetForm({ username: '', justificacion: '' });
    setResetError('');
    setResetSuccess('');
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    const { username: resetUsername, justificacion } = resetForm;

    if (!resetUsername.trim() || !justificacion.trim()) {
      setResetError('Complete todos los campos, incluyendo la justificación.');
      return;
    }

    setResetLoading(true);
    try {
      setResetSuccess(await solicitarCambioPassword(resetUsername.trim(), justificacion.trim()));
      setResetForm({ username: '', justificacion: '' });
    } catch (err) {
      setResetError(err.message || 'No se pudo enviar la solicitud.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div id="loginView" className="screen active">
      <div className="login-shell">
        <div className="brand-panel">
          <span className="eyebrow">Sistema de ventas</span>
          <h1>Web Kiosko</h1>
          <p>Panel de administración y punto de venta para kiosco y minimarket.</p>
        </div>

        <div className="login-card">
          <div>
            <h2>Iniciar sesión</h2>
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
                <div className="form-message error">{authError}</div>
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
                Contraseña
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

            <button type="button" className="reset-link" onClick={openResetModal}>
              ¿Olvidó su contraseña?
            </button>

            <div className="demo-box">
              <strong>Usuarios de prueba (backend)</strong>
              <span>Admin: admin / admin123</span>
              <span>Cajero: cajero / cajero123</span>
            </div>
          </div>
        </div>

        {showResetModal && (
          <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Recuperar contraseña</h3>
                <button className="modal-close" onClick={() => setShowResetModal(false)} aria-label="Cerrar">×</button>
              </div>
              {resetSuccess ? (
                <div className="reset-form">
                  <div className="form-message success" role="status">{resetSuccess}</div>
                  <button type="button" className="primary-btn full" onClick={() => setShowResetModal(false)}>
                    Cerrar
                  </button>
                </div>
              ) : (
                <form className="reset-form" onSubmit={handleResetSubmit}>
                  <p className="reset-help">
                    Un administrador va a revisar el pedido y le va a informar la nueva contraseña.
                  </p>
                  {resetError && <div className="form-message error" role="alert">{resetError}</div>}

                  <div className="form-field">
                    <label htmlFor="resetUsername">Usuario <span className="required">*</span></label>
                    <input
                      type="text"
                      id="resetUsername"
                      value={resetForm.username}
                      onChange={e => setResetForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Su usuario (los cajeros usan su DNI)"
                      required
                      autoComplete="username"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="justificacion">Justificación / Motivo <span className="required">*</span></label>
                    <textarea
                      id="justificacion"
                      value={resetForm.justificacion}
                      onChange={e => setResetForm(prev => ({ ...prev, justificacion: e.target.value }))}
                      placeholder="Explique el motivo de la solicitud (obligatorio para auditoría)"
                      required
                      rows={3}
                      maxLength={500}
                    />
                  </div>

                  <div className="form-actions">
                    <button type="button" className="secondary-btn full" onClick={() => setShowResetModal(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="primary-btn full" disabled={resetLoading}>
                      {resetLoading ? 'Enviando...' : 'Enviar solicitud'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
