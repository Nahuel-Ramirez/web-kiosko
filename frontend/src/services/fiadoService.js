import { API_URL } from './api';

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

export async function obtenerCuentaFiado(clienteId) {
  const response = await fetch(`${API_URL}/api/clientes/${clienteId}/movimientos`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(await mensajeDeError(response, 'Error al obtener la cuenta del cliente'));
  return response.json();
}

export async function registrarPagoFiado(clienteId, monto, observaciones) {
  const response = await fetch(`${API_URL}/api/clientes/${clienteId}/pagos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ monto, observaciones: observaciones || null }),
  });
  if (!response.ok) throw new Error(await mensajeDeError(response, 'Error al registrar el pago'));
  return response.json();
}

export async function listarDeudores() {
  const response = await fetch(`${API_URL}/api/fiados/deudores`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(await mensajeDeError(response, 'Error al obtener los deudores'));
  return response.json();
}
