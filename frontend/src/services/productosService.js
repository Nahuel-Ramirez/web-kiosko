import { API_URL } from './api';

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

/** Convierte un producto de la API al formato que usa la UI. Los Decimal llegan como string. */
export function aProductoUI(p) {
  return {
    id: p.id,
    code: p.codigo_barras,
    name: p.nombre,
    // Al cajero la API no le manda el precio de costo.
    cost: p.precio_costo != null ? Number(p.precio_costo) : null,
    price: Number(p.precio_venta),
    stock: p.stock_actual,
    minStock: p.stock_minimo,
    active: p.activo !== false,
  };
}

/** Convierte los datos del formulario de la UI al formato que espera la API. */
function aProductoAPI(datos) {
  const body = {};
  if (datos.code !== undefined) body.codigo_barras = datos.code;
  if (datos.name !== undefined) body.nombre = datos.name;
  if (datos.cost !== undefined) body.precio_costo = Number(datos.cost);
  if (datos.price !== undefined) body.precio_venta = Number(datos.price);
  if (datos.stock !== undefined) body.stock_actual = Number(datos.stock);
  if (datos.minStock !== undefined) body.stock_minimo = Number(datos.minStock);
  if (datos.active !== undefined) body.activo = Boolean(datos.active);
  return body;
}

/** Por defecto solo los activos; con incluirInactivos (solo ADMIN) también los dados de baja. */
export async function listarProductos({ incluirInactivos = false } = {}) {
  // El backend pagina con limit=100 por defecto; pedimos más para el inventario completo.
  const extra = incluirInactivos ? '&incluir_inactivos=true' : '';
  const response = await fetch(`${API_URL}/api/productos?limit=1000${extra}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(await extraerMensajeError(response, 'Error al obtener productos'));
  const data = await response.json();
  return data.map(aProductoUI);
}

export async function buscarProductoPorCodigo(codigo) {
  const response = await fetch(`${API_URL}/api/productos/codigo/${encodeURIComponent(codigo)}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(await extraerMensajeError(response, 'Producto no encontrado'));
  return aProductoUI(await response.json());
}

export async function crearProducto(datos) {
  const response = await fetch(`${API_URL}/api/productos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(aProductoAPI(datos)),
  });
  if (!response.ok) throw new Error(await extraerMensajeError(response, 'Error al crear producto'));
  return aProductoUI(await response.json());
}

export async function actualizarProducto(id, datos) {
  const response = await fetch(`${API_URL}/api/productos/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(aProductoAPI(datos)),
  });
  if (!response.ok) throw new Error(await extraerMensajeError(response, 'Error al actualizar producto'));
  return aProductoUI(await response.json());
}

/** POST /api/productos/{id}/stock: suma `cantidad` (>= 1) al stock actual. */
export async function agregarStock(id, cantidad) {
  const params = new URLSearchParams({ cantidad: String(cantidad) });
  const response = await fetch(`${API_URL}/api/productos/${id}/stock?${params}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(await extraerMensajeError(response, 'Error al agregar stock'));
  return aProductoUI(await response.json());
}

/** PUT /api/productos/{id}/stock: fija el stock en un valor absoluto (>= 0). */
export async function setearStock(id, stockNuevo) {
  const params = new URLSearchParams({ stock_nuevo: String(stockNuevo) });
  const response = await fetch(`${API_URL}/api/productos/${id}/stock?${params}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(await extraerMensajeError(response, 'Error al ajustar stock'));
  return aProductoUI(await response.json());
}

/** DELETE /api/productos/{id}. Si el producto tiene ventas el backend responde 409 con el motivo. */
export async function eliminarProducto(id) {
  const response = await fetch(`${API_URL}/api/productos/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    // 409 = tiene ventas: la pantalla ofrece darlo de baja en lugar de borrarlo.
    const error = new Error(await extraerMensajeError(response, 'Error al eliminar producto'));
    error.status = response.status;
    throw error;
  }
}
