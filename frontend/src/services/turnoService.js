const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('web_kiosko_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function extraerMensajeError(response, mensajePorDefecto) {
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') return data.detail;
    // Errores de validación de FastAPI (422): detail es una lista.
    if (Array.isArray(data.detail) && data.detail.length) return data.detail[0].msg;
    return mensajePorDefecto;
  } catch {
    return mensajePorDefecto;
  }
}

/** Fecha local en formato YYYY-MM-DD (la API incluye el día completo). */
export function fechaLocalISO(fecha = new Date()) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * POST /api/turnos/ventas. Devuelve la venta creada (201).
 * Si el backend la rechaza (409 sin stock, 400 datos inválidos) lanza un Error con su mensaje.
 */
export async function registrarVenta(venta) {
  const response = await fetch(`${API_URL}/api/turnos/ventas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(venta),
  });
  if (!response.ok) throw new Error(await extraerMensajeError(response, 'Error al registrar la venta'));
  return response.json();
}

/** GET /api/turnos/turno-actual: ventas sin cierre del usuario y totales calculados en el servidor. */
export async function obtenerTurnoActual() {
  const response = await fetch(`${API_URL}/api/turnos/turno-actual`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(await extraerMensajeError(response, 'Error al obtener el turno actual'));
  return response.json();
}

export async function crearCierre(datos) {
  const response = await fetch(`${API_URL}/api/turnos/cierre`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(datos),
  });
  if (!response.ok) throw new Error(await extraerMensajeError(response, 'Error al cerrar caja'));
  return response.json();
}

export async function obtenerMisCierres() {
  const response = await fetch(`${API_URL}/api/turnos/mis-cierres`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener cierres');
  return response.json();
}

export async function obtenerMisVentas(fechaDesde, fechaHasta) {
  const params = new URLSearchParams();
  if (fechaDesde) params.append('fecha_desde', fechaLocalISO(fechaDesde));
  if (fechaHasta) params.append('fecha_hasta', fechaLocalISO(fechaHasta));
  const response = await fetch(`${API_URL}/api/turnos/mis-ventas?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener ventas');
  return response.json();
}