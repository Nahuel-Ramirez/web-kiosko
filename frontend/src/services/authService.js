const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function extraerMensajeError(response) {
  try {
    const data = await response.json();
    return data.detail || 'Ocurrió un error inesperado.';
  } catch {
    return 'Ocurrió un error inesperado.';
  }
}

/**
 * Llama a POST /api/auth/login. Devuelve { access_token, token_type, rol, nombre }.
 * Lanza un Error con el mensaje del backend si las credenciales son inválidas.
 */
export async function login(username, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(await extraerMensajeError(response));
  }

  return response.json();
}

/** Llama a POST /api/auth/logout. No hace falta esperar el resultado para cerrar sesión en el front. */
export async function logout(token) {
  return fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Llama a GET /api/auth/me para validar un token guardado y recuperar los datos del usuario. */
export async function fetchCurrentUser(token) {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Sesión inválida o expirada.');
  }

  return response.json();
}
