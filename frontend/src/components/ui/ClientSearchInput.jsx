import { useState, useCallback, useEffect, useRef } from 'react';

export function ClientSearchInput({ onSelect, placeholder = 'Buscar cliente por DNI/CUIT...', initialClient = null }) {
  const [query, setQuery] = useState(initialClient ? '' : '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(initialClient);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  function getAuthHeaders() {
    const token = localStorage.getItem('web_kiosko_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  const debouncedSearch = useRef(null);

  const searchClients = useCallback(async (dni) => {
    if (!dni || dni.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (debouncedSearch.current) clearTimeout(debouncedSearch.current);

    debouncedSearch.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ dni: dni.trim() });
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/clientes/buscar?${params}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('web_kiosko_token')}`,
          },
        });

        if (!response.ok) throw new Error('Error al buscar clientes');

        const data = await response.json();
        setResults(data);
        setShowDropdown(data.length > 0);
      } catch (err) {
        setError(err.message);
        setResults([]);
        setShowDropdown(false);
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
    onSelect?.(client);
  };

  const handleClear = () => {
    setSelectedClient(null);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    onSelect?.(null);
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = selectedClient
    ? `${selectedClient.nombre} (${selectedClient.dni || selectedClient.cuit})`
    : '';

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
              No se encontraron clientes. <button type="button" className="link-btn" onClick={() => window.location.href = '/admin#clientes'}>
                Registrar nuevo
              </button>
            </div>
          )}
        </div>
      )}

      {loading && <div className="client-loading">Buscando...</div>}
      {error && <div className="client-error">{error}</div>}
    </div>
  );
}