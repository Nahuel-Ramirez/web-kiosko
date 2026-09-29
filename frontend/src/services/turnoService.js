const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('web_kiosko_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
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
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Error al cerrar caja');
  }
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
  if (fechaDesde) params.append('fecha_desde', fechaDesde.toISOString());
  if (fechaHasta) params.append('fecha_hasta', fechaHasta.toISOString());
  const response = await fetch(`${API_URL}/api/turnos/mis-ventas?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener ventas');
  return response.json();
}