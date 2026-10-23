const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('web_kiosko_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function buscarCliente(dni) {
  const params = new URLSearchParams({ dni: dni.trim() });
  const response = await fetch(`${API_URL}/api/clientes/buscar?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al buscar cliente');
  return response.json();
}

export async function listarClientes() {
  const response = await fetch(`${API_URL}/api/clientes`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener clientes');
  return response.json();
}

export async function crearCliente(datos) {
  const response = await fetch(`${API_URL}/api/clientes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(datos),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al crear cliente');
  }
  return response.json();
}