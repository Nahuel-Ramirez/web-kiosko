import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  listarClientes,
  crearCliente,
  editarCliente,
  eliminarCliente,
} from '../services/clienteService';

export function Clientes() {
  const { currentUser: _currentUser } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    dni_cuit: '',
    razon_social: '',
    domicilio: '',
    telefono: '',
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const cargarClientes = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listarClientes();
      setClientes(data);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ dni_cuit: '', razon_social: '', domicilio: '', telefono: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingId) {
        await editarCliente(editingId, {
          dni_cuit: formData.dni_cuit.trim() || undefined,
          razon_social: formData.razon_social.trim() || undefined,
          domicilio: formData.domicilio.trim() || undefined,
          telefono: formData.telefono.trim() || undefined,
        });
        setShowForm(false);
        setEditingId(null);
        setFormData({ dni_cuit: '', razon_social: '', domicilio: '', telefono: '' });
      } else {
        await crearCliente({
          dni_cuit: formData.dni_cuit.trim(),
          razon_social: formData.razon_social.trim(),
          domicilio: formData.domicilio.trim() || undefined,
          telefono: formData.telefono.trim() || undefined,
        });
        setShowForm(false);
        setFormData({ dni_cuit: '', razon_social: '', domicilio: '', telefono: '' });
      }
      await cargarClientes();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (cliente) => {
    setEditingId(cliente.id);
    setFormData({
      dni_cuit: cliente.dni_cuit || '',
      razon_social: cliente.razon_social,
      domicilio: cliente.domicilio || '',
      telefono: cliente.telefono || '',
    });
    setShowForm(true);
    setError('');
  };

  const handleEliminar = async (cliente) => {
    if (!window.confirm(`¿Eliminar al cliente "${cliente.razon_social}"?`)) return;
    setDeletingId(cliente.id);
    setError('');
    try {
      await eliminarCliente(cliente.id);
      await cargarClientes();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el cliente.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <section id="clientesPanel" className="panel active-panel">
        <div className="empty-state">Cargando clientes...</div>
      </section>
    );
  }

  return (
    <section id="clientesPanel" className="panel active-panel">
      <div className="content-grid two-columns">
        <div className="card">
          <div className="card-header">
            <h3>{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          </div>
          <form className="product-form" onSubmit={handleSubmit}>
            {error && <div className="form-message error">{error}</div>}

            <div className="form-field">
              <label htmlFor="cliDni">CUIL / DNI <span className="required">*</span></label>
              <input
                id="cliDni"
                name="dni_cuit"
                value={formData.dni_cuit}
                onChange={handleChange}
                placeholder="Ej: 20123456789"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="cliNombre">Nombre / Razón Social <span className="required">*</span></label>
              <input
                id="cliNombre"
                name="razon_social"
                value={formData.razon_social}
                onChange={handleChange}
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="cliDomicilio">Domicilio</label>
              <input
                id="cliDomicilio"
                name="domicilio"
                value={formData.domicilio}
                onChange={handleChange}
                placeholder="Ej: Calle Falsa 123"
              />
            </div>

            <div className="form-field">
              <label htmlFor="cliTelefono">Teléfono</label>
              <input
                id="cliTelefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Ej: 11-5555-0101"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-btn full" disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear cliente'}
              </button>
              {editingId && (
                <button type="button" className="secondary-btn full" onClick={handleCancel} disabled={saving}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Listado de clientes</h3>
            {!editingId && (
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setShowForm(true);
                  setEditingId(null);
                  setFormData({ dni_cuit: '', razon_social: '', domicilio: '', telefono: '' });
                }}
              >
                + Nuevo cliente
              </button>
            )}
          </div>
          {clientes.length === 0 && (
            <div className="empty-state">No hay clientes cargados.</div>
          )}
          {clientes.length > 0 && (
            <div className="table-wrapper scroll-y">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Nombre / Razón Social</th>
                    <th>CUIL / DNI</th>
                    <th>Domicilio</th>
                    <th>Teléfono</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(cliente => (
                    <tr key={cliente.id}>
                      <td>
                        <strong>{cliente.razon_social}</strong>
                      </td>
                      <td>
                        <code>{cliente.dni_cuit || '-'}</code>
                      </td>
                      <td>
                        <small>{cliente.domicilio || '-'}</small>
                      </td>
                      <td>
                        <small>{cliente.telefono || '-'}</small>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="mini-btn edit-btn"
                            onClick={() => handleEditar(cliente)}
                            disabled={deletingId !== null}
                          >
                            Editar
                          </button>
                          <button
                            className="mini-btn danger"
                            onClick={() => handleEliminar(cliente)}
                            disabled={deletingId !== null || saving}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
