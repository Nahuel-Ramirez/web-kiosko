import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  listarClientes,
  crearCliente,
  editarCliente,
  eliminarCliente,
} from '../services/clienteService';

const LIMITE_FIADO_POR_DEFECTO = '10000';

const FORM_VACIO = {
  tipo: 'persona',
  dni_cuit: '',
  nombre: '',
  apellido: '',
  razon_social: '',
  email: '',
  domicilio: '',
  telefono: '',
  limite_fiado: LIMITE_FIADO_POR_DEFECTO,
  activo: 'true',
};

// Persona: el backend arma razon_social como "Apellido Nombre". Comercio: se manda directo.
function armarPayload(form, esAdmin, editando) {
  const opcional = (valor) => valor.trim() || null;
  const datos = {
    dni_cuit: form.dni_cuit.trim(),
    email: opcional(form.email),
    domicilio: opcional(form.domicilio),
    telefono: opcional(form.telefono),
  };
  if (form.tipo === 'persona') {
    datos.nombre = form.nombre.trim();
    datos.apellido = form.apellido.trim();
  } else {
    datos.razon_social = form.razon_social.trim();
    datos.nombre = null;
    datos.apellido = null;
  }
  if (esAdmin) {
    datos.limite_fiado = form.limite_fiado === '' ? LIMITE_FIADO_POR_DEFECTO : form.limite_fiado;
  }
  if (editando) {
    datos.activo = form.activo === 'true';
  }
  return datos;
}

export function Clientes() {
  const { currentUser } = useAuth();
  const { formatMoney } = useApp();
  const esAdmin = currentUser?.role === 'Administrador';

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(FORM_VACIO);
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
    setFormData(FORM_VACIO);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingId) {
        await editarCliente(editingId, armarPayload(formData, esAdmin, true));
        setShowForm(false);
        setEditingId(null);
      } else {
        await crearCliente(armarPayload(formData, esAdmin, false));
        setShowForm(false);
      }
      setFormData(FORM_VACIO);
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
      tipo: cliente.nombre && cliente.apellido ? 'persona' : 'comercio',
      dni_cuit: cliente.dni_cuit || '',
      nombre: cliente.nombre || '',
      apellido: cliente.apellido || '',
      razon_social: cliente.razon_social,
      email: cliente.email || '',
      domicilio: cliente.domicilio || '',
      telefono: cliente.telefono || '',
      limite_fiado: cliente.limite_fiado != null ? String(Number(cliente.limite_fiado)) : LIMITE_FIADO_POR_DEFECTO,
      activo: cliente.activo === false ? 'false' : 'true',
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

  const esPersona = formData.tipo === 'persona';

  return (
    <section id="clientesPanel" className="panel active-panel">
      <div className="content-grid two-columns">
        <div className="card">
          <div className="card-header">
            <h3>{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          </div>
          <form className="product-form" onSubmit={handleSubmit}>
            {error && <div className="form-message error">{error}</div>}

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="cliTipo">Tipo de cliente</label>
                <select id="cliTipo" name="tipo" value={formData.tipo} onChange={handleChange}>
                  <option value="persona">Persona</option>
                  <option value="comercio">Comercio / empresa</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="cliDni">CUIL / DNI <span className="required">*</span></label>
                <input
                  id="cliDni"
                  name="dni_cuit"
                  value={formData.dni_cuit}
                  onChange={handleChange}
                  placeholder="Ej: 20123456789"
                  inputMode="numeric"
                  required
                />
              </div>
            </div>

            {esPersona ? (
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="cliNombre">Nombre <span className="required">*</span></label>
                  <input
                    id="cliNombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Juan"
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="cliApellido">Apellido <span className="required">*</span></label>
                  <input
                    id="cliApellido"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    placeholder="Ej: Pérez"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="form-field">
                <label htmlFor="cliRazonSocial">Razón social <span className="required">*</span></label>
                <input
                  id="cliRazonSocial"
                  name="razon_social"
                  value={formData.razon_social}
                  onChange={handleChange}
                  placeholder="Ej: Kiosco La Esquina SRL"
                  required
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="cliEmail">Email</label>
              <input
                id="cliEmail"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Ej: juan@mail.com"
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

            {(esAdmin || editingId) && (
              <div className="form-row">
                {esAdmin && (
                  <div className="form-field">
                    <label htmlFor="cliLimite">Límite de fiado</label>
                    <input
                      id="cliLimite"
                      name="limite_fiado"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.limite_fiado}
                      onChange={handleChange}
                    />
                  </div>
                )}
                {editingId && (
                  <div className="form-field">
                    <label htmlFor="cliActivo">Estado</label>
                    <select id="cliActivo" name="activo" value={formData.activo} onChange={handleChange}>
                      <option value="true">Activo</option>
                      <option value="false">Dado de baja</option>
                    </select>
                  </div>
                )}
              </div>
            )}

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
                    <th>Límite fiado</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(cliente => (
                    <tr key={cliente.id}>
                      <td>
                        <strong>{cliente.razon_social}</strong>
                        {cliente.email && (
                          <>
                            <br />
                            <small>{cliente.email}</small>
                          </>
                        )}
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
                        <small>{formatMoney(Number(cliente.limite_fiado ?? 0))}</small>
                      </td>
                      <td>
                        <span className={`stock-badge ${cliente.activo === false ? 'empty' : 'ok'}`}>
                          {cliente.activo === false ? 'Inactivo' : 'Activo'}
                        </span>
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
