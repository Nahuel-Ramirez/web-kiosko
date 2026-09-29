const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('web_kiosko_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDateForAPI(date) {
  return date.toISOString().split('T')[0];
}

export async function fetchReportePeriodo(fechaDesde, fechaHasta) {
  const params = new URLSearchParams({
    fecha_desde: formatDateForAPI(fechaDesde),
    fecha_hasta: formatDateForAPI(fechaHasta),
  });
  const response = await fetch(`${API_URL}/api/turnos/reporte/periodo?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener reporte de período');
  return response.json();
}

export async function fetchReportePorUsuario(usuarioId, fechaDesde, fechaHasta) {
  const params = new URLSearchParams();
  if (fechaDesde) params.append('fecha_desde', formatDateForAPI(fechaDesde));
  if (fechaHasta) params.append('fecha_hasta', formatDateForAPI(fechaHasta));
  const response = await fetch(`${API_URL}/api/turnos/reporte/usuario/${usuarioId}?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener reporte por usuario');
  return response.json();
}

export async function fetchUsuarios() {
  const response = await fetch(`${API_URL}/api/usuarios`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener usuarios');
  return response.json();
}