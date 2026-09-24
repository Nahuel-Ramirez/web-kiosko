import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario } from '../services/usuariosService';

export function Cajeros() {
  const { currentUser } = useAuth();
  const token = currentUser?.token;

  const [cajeros, setCajeros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ nombre: '', dni: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cargarCajeros = useCallback(async () => {
    setLoading(true);
    try {
      const usuarios = await listarUsuarios(token);
      setCajeros(usuarios.filter((u) => u.rol === 'CAJERO'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) cargarCajeros();
  }, [token, cargarCajeros]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const nombre = formData.nombre.trim();
    const dni = formData.dni.trim();
    const { password } = formData;

    if (!nombre || !dni || !password) {
      setError('Complete todos los campos.');
      return;
    }
    if (!/^\d{7,9}$/.test(dni)) {
      setError('El DNI debe tener entre 7 y 9 números, sin puntos.');
      return;
    }
    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      // El DNI se usa como nombre de usuario para iniciar sesión.
      await crearUsuario(token, {
        nombre,
        username: dni,
        dni,
        password,
        rol: 'CAJERO',
        activo: true,
      });
      setSuccess(`Cajero "${nombre}" creado. Ya puede iniciar sesión con el DNI ${dni}.`);
      setFormData({ nombre: '', dni: '', password: '' });
      cargarCajeros();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActivo = async (cajero) => {
    setError('');
    try {
      await actualizarUsuario(token, cajero.id, { activo: !cajero.activo });
      cargarCajeros();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEliminar = async (cajero) => {
    if (!window.confirm(`¿Eliminar a "${cajero.nombre}"? Esta acción no se puede deshacer.`)) return;
    setError('');
    try {
      await eliminarUsuario(token, cajero.id);
      cargarCajeros();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section id="cajerosPanel" className="panel active-panel">
      <div className="content-grid two-columns admin-grid">
        <div className="card">
          <div className="card-header">
            <h3>Alta de cajero</h3>
          </div>
          <form className="product-form" onSubmit={handleSubmit}>
            {error && <div className="form-message error">{error}</div>}
            {success && <div className="form-message success">{success}</div>}

            <div className="form-field">
              <label htmlFor="cajeroNombre">Nombre completo <span className="required">*</span></label>
              <input
                type="text"
                id="cajeroNombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: Juan Pérez"
                required
                autoComplete="off"
              />
            </div>

            <div className="form-field">
              <label htmlFor="cajeroDni">DNI <span className="required">*</span></label>
              <input
                type="text"
                id="cajeroDni"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                placeholder="Ej: 30123456"
                required
                autoComplete="off"
              />
              <small>Se usa como usuario para iniciar sesión (sin puntos).</small>
            </div>

            <div className="form-field">
              <label htmlFor="cajeroPassword">Contraseña <span className="required">*</span></label>
              <input
                type="password"
                id="cajeroPassword"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="****"
                required
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="primary-btn full" disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear cajero'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Cajeros</h3>
            <span className="badge">{cajeros.length} cajeros</span>
          </div>
          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>DNI</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="4" className="empty-row">
                      <div className="empty-state">
                        <span>Cargando...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && cajeros.map((cajero) => (
                  <tr key={cajero.id}>
                    <td><strong>{cajero.nombre}</strong></td>
                    <td><code>{cajero.dni || cajero.username}</code></td>
                    <td>
                      <button
                        type="button"
                        className={`stock-badge ${cajero.activo ? 'ok' : 'empty'}`}
                        onClick={() => handleToggleActivo(cajero)}
                      >
                        {cajero.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td>
                      <button
                        className="mini-btn danger"
                        onClick={() => handleEliminar(cajero)}
                        aria-label={`Eliminar ${cajero.nombre}`}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && cajeros.length === 0 && (
                  <tr>
                    <td colSpan="4" className="empty-row">
                      <div className="empty-state">
                        <span>No hay cajeros cargados</span>
                        <small>Use el formulario de la izquierda para agregar el primero</small>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
