import { API_URL } from './api';

async function extraerMensajeError(response) {
  try {
    const data = await response.json();
    if (Array.isArray(data.detail) && data.detail.length) return data.detail[0].msg.replace(/^Value error, /, '');
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

/** GET /api/usuarios/solicitudes-password: pedidos de contraseña pendientes (solo ADMIN) */
export async function listarSolicitudesPassword(token) {
  const response = await fetch(`${API_URL}/api/usuarios/solicitudes-password`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await extraerMensajeError(response));
  }
  return response.json();
}

/** POST /api/usuarios/solicitudes-password/{id}/resolver: le pone la contraseña nueva (solo ADMIN) */
export async function resolverSolicitudPassword(token, solicitudId, passwordNueva) {
  const response = await fetch(`${API_URL}/api/usuarios/solicitudes-password/${solicitudId}/resolver`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ password_nueva: passwordNueva }),
  });
  if (!response.ok) {
    throw new Error(await extraerMensajeError(response));
  }
  return response.json();
}

/** POST /api/usuarios/solicitudes-password/{id}/rechazar (solo ADMIN) */
export async function rechazarSolicitudPassword(token, solicitudId) {
  const response = await fetch(`${API_URL}/api/usuarios/solicitudes-password/${solicitudId}/rechazar`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await extraerMensajeError(response));
  }
  return response.json();
}
