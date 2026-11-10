import { useState, useCallback, useEffect, useRef } from 'react';
import { crearCliente } from '../../services/clienteService';
import { API_URL } from '../../services/api';

const ALTA_VACIA = { tipo: 'persona', nombre: '', apellido: '', razon_social: '', dni_cuit: '', email: '', domicilio: '', telefono: '' };

const campoStyle = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  border: '1px solid var(--line)',
  borderRadius: '8px',
  fontSize: '0.9rem',
};

// La regla global de label en index.css es para el login (texto blanco); acá el fondo es claro.
const labelStyle = { color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem' };

export function ClientSearchInput({ onSelect, placeholder = 'Buscar cliente por CUIL/DNI...', initialClient = null }) {
  const [query, setQuery] = useState(initialClient ? '' : '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(initialClient);
  const [showDropdown, setShowDropdown] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(false);
  const [createData, setCreateData] = useState(ALTA_VACIA);
  const [createError, setCreateError] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const debouncedSearch = useRef(null);

  const searchClients = useCallback(async (dni) => {
    if (!dni || dni.length < 3) {
      setResults([]);
      setShowDropdown(false);
      setCreateForm(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (debouncedSearch.current) clearTimeout(debouncedSearch.current);

    debouncedSearch.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ dni: dni.trim() });
        const response = await fetch(`${API_URL}/api/clientes/buscar?${params}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('web_kiosko_token')}`,
          },
        });

        if (!response.ok) throw new Error('Error al buscar clientes');

        const data = await response.json();
        setResults(data);
        setShowDropdown(data.length > 0);
        setCreateForm(data.length === 0);
      } catch (err) {
        setError(err.message);
        setResults([]);
        setShowDropdown(false);
        setCreateForm(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    if (debouncedSearch.current) clearTimeout(debouncedSearch.current);
    return () => {
      if (debouncedSearch.current) clearTimeout(debouncedSearch.current);
    };
  }, []);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setQuery(client.dni || client.cuit || '');
    setShowDropdown(false);
    setCreateForm(false);
    onSelect?.(client);
  };

  const handleClear = () => {
    setSelectedClient(null);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setCreateForm(false);
    onSelect?.(null);
  };

  const handleCreateToggle = () => {
    setCreateForm(!createForm);
    setCreateError(null);
    setCreateData(ALTA_VACIA);
  };

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateData(prev => ({ ...prev, [name]: value }));
    setCreateError(null);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      // Persona: el backend arma la razon social como "Apellido Nombre".
      const esPersona = createData.tipo === 'persona';
      const nuevo = await crearCliente({
        nombre: esPersona ? createData.nombre.trim() : null,
        apellido: esPersona ? createData.apellido.trim() : null,
        razon_social: esPersona ? null : createData.razon_social.trim(),
        dni_cuit: createData.dni_cuit.trim(),
        email: createData.email.trim() || null,
        domicilio: createData.domicilio.trim() || null,
        telefono: createData.telefono.trim() || null,
      });
      const client = {
        id: nuevo.id,
        nombre: nuevo.razon_social,
        dni: nuevo.dni_cuit.length === 11 ? undefined : nuevo.dni_cuit,
        cuit: nuevo.dni_cuit.length === 11 ? nuevo.dni_cuit : undefined,
      };
      setSelectedClient(client);
      setQuery(nuevo.dni_cuit);
      setShowDropdown(false);
      setCreateForm(false);
      onSelect?.(client);
    } catch (err) {
      setCreateError(err.message || 'Error al crear cliente');
    } finally {
      setCreating(false);
    }
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      const enDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      const enInput = inputRef.current && inputRef.current.contains(e.target);
      if (!enDropdown && !enInput) {
        setShowDropdown(false);
        setCreateForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="client-search-wrapper" ref={dropdownRef}>
      <div className="client-search-input-wrapper">
        <label className="client-search-label">
          <span>Cliente</span>
          <div className="client-search-input-wrapper-inner">
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                searchClients(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => {
                if (query.length >= 3) setShowDropdown(true);
              }}
              autoComplete="off"
              className="client-search-input"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                border: '2px solid var(--line)',
                borderRadius: '10px',
                fontSize: '1rem',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
            />
            {selectedClient && (
              <button
                type="button"
                className="client-clear-btn"
                onClick={handleClear}
                aria-label="Limpiar cliente"
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
        </label>
      </div>

      {showDropdown && results.length > 0 && (
        <div className="client-dropdown">
          {results.map((client) => (
            <button
              key={client.id}
              type="button"
              className="client-dropdown-item"
              onClick={() => handleSelectClient(client)}
            >
              <div className="client-dropdown-name">{client.nombre}</div>
              <div className="client-dropdown-dni">
                {client.dni ? `DNI: ${client.dni}` : client.cuit ? `CUIT: ${client.cuit}` : 'Sin documento'}
              </div>
            </button>
          ))}
          {results.length === 0 && query.length >= 3 && !loading && (
            <div className="client-dropdown-empty">
              No se encontraron clientes.
              <button type="button" className="link-btn" onClick={handleCreateToggle}>
                Crear cliente
              </button>
            </div>
          )}
        </div>
      )}

      {createForm && (
        <div className="client-create-form">
          <h4 className="client-create-title">Nuevo cliente</h4>
          {createError && <div className="client-error">{createError}</div>}
          <form onSubmit={handleCreateSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="create-field">
                <label className="create-label" style={labelStyle}>Tipo</label>
                <select name="tipo" value={createData.tipo} onChange={handleCreateChange} style={campoStyle}>
                  <option value="persona">Persona</option>
                  <option value="comercio">Comercio / empresa</option>
                </select>
              </div>
              <div className="create-field">
                <label className="create-label" style={labelStyle}>CUIL / DNI <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  name="dni_cuit"
                  value={createData.dni_cuit}
                  onChange={handleCreateChange}
                  placeholder="Ej: 20123456789"
                  inputMode="numeric"
                  required
                  style={campoStyle}
                />
              </div>
            </div>
            {createData.tipo === 'persona' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="create-field">
                  <label className="create-label" style={labelStyle}>Nombre <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    name="nombre"
                    value={createData.nombre}
                    onChange={handleCreateChange}
                    placeholder="Ej: Juan"
                    required
                    style={campoStyle}
                  />
                </div>
                <div className="create-field">
                  <label className="create-label" style={labelStyle}>Apellido <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    name="apellido"
                    value={createData.apellido}
                    onChange={handleCreateChange}
                    placeholder="Ej: Pérez"
                    required
                    style={campoStyle}
                  />
                </div>
              </div>
            ) : (
              <div className="create-field">
                <label className="create-label" style={labelStyle}>Razón social <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  name="razon_social"
                  value={createData.razon_social}
                  onChange={handleCreateChange}
                  placeholder="Ej: Kiosco La Esquina SRL"
                  required
                  style={campoStyle}
                />
              </div>
            )}
            <div className="create-field">
              <label className="create-label" style={labelStyle}>Domicilio</label>
              <input
                name="domicilio"
                value={createData.domicilio}
                onChange={handleCreateChange}
                placeholder="Ej: Calle Falsa 123"
                style={campoStyle}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="create-field">
                <label className="create-label" style={labelStyle}>Teléfono</label>
                <input
                  name="telefono"
                  value={createData.telefono}
                  onChange={handleCreateChange}
                  placeholder="Ej: 11-5555-0101"
                  style={campoStyle}
                />
              </div>
              <div className="create-field">
                <label className="create-label" style={labelStyle}>Email</label>
                <input
                  name="email"
                  type="email"
                  value={createData.email}
                  onChange={handleCreateChange}
                  placeholder="Ej: juan@mail.com"
                  style={campoStyle}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={creating}
                className="primary-btn"
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  fontSize: '0.9rem',
                }}
              >
                {creating ? 'Creando...' : 'Crear cliente'}
              </button>
              <button
                type="button"
                onClick={handleCreateToggle}
                className="secondary-btn"
                style={{
                  padding: '0.6rem 1rem',
                  fontSize: '0.9rem',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="client-loading">Buscando...</div>}
      {error && <div className="client-error">{error}</div>}
    </div>
  );
}
