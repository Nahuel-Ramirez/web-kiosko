const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('web_kiosko_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// El backend devuelve detail como texto (reglas de negocio) o como lista (validación 422).
async function mensajeDeError(response, porDefecto) {
  const err = await response.json().catch(() => ({}));
  if (Array.isArray(err.detail)) return err.detail.map(d => d.msg.replace(/^Value error, /, '')).join('. ');
  return err.detail || porDefecto;
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
  if (!response.ok) throw new Error(await mensajeDeError(response, 'Error al crear cliente'));
  return response.json();
}

export async function editarCliente(id, datos) {
  const response = await fetch(`${API_URL}/api/clientes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(datos),
  });
  if (!response.ok) throw new Error(await mensajeDeError(response, 'Error al editar cliente'));
  return response.json();
}

export async function eliminarCliente(id) {
  const response = await fetch(`${API_URL}/api/clientes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(await mensajeDeError(response, 'Error al eliminar cliente'));
}