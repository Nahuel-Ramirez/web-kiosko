const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function extraerMensajeError(response) {
  try {
    const data = await response.json();
    return data.detail || 'Ocurrió un error inesperado.';
  } catch {
    return 'Ocurrió un error inesperado.';
  }
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/** GET /api/usuarios (solo ADMIN) */
export async function listarUsuarios(token) {
  const response = await fetch(`${API_URL}/api/usuarios`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await extraerMensajeError(response));
  }
  return response.json();
}

/** POST /api/usuarios (solo ADMIN) */
export async function crearUsuario(token, datos) {
  const response = await fetch(`${API_URL}/api/usuarios`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(datos),
  });
  if (!response.ok) {
    throw new Error(await extraerMensajeError(response));
  }
  return response.json();
}

/** PUT /api/usuarios/{id} (solo ADMIN) */
export async function actualizarUsuario(token, usuarioId, datos) {
  const response = await fetch(`${API_URL}/api/usuarios/${usuarioId}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(datos),
  });
  if (!response.ok) {
    throw new Error(await extraerMensajeError(response));
  }
  return response.json();
}

/** DELETE /api/usuarios/{id} (solo ADMIN) */
export async function eliminarUsuario(token, usuarioId) {
  const response = await fetch(`${API_URL}/api/usuarios/${usuarioId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(await extraerMensajeError(response));
  }
}
