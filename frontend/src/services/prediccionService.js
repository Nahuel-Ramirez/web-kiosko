const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('web_kiosko_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchVentasPorHora(fechaDesde, fechaHasta) {
  const params = new URLSearchParams({
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
  });
  const response = await fetch(`${API_URL}/api/reportes/ventas-por-hora?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener ventas por hora');
  return response.json();
}

export async function fetchHorasPico(fechaDesde, fechaHasta) {
  const params = new URLSearchParams({
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
  });
  const response = await fetch(`${API_URL}/api/reportes/horas-pico?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener horas pico');
  return response.json();
}