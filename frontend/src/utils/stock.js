// Umbrales fijos de stock: menor a 50 es "Crítico", menor a 100 es "Bajo",
// 100 o más es "OK". Ambos niveles (bajo y crítico) entran en las alertas.
export function getStockStatus(stock, minimo = 5) {
  if (stock <= 0) return { label: 'Sin stock', className: 'empty', level: 'empty' };
  if (stock < 50) return { label: 'Crítico', className: 'critical', level: 'critical' };
  if (stock < 100) return { label: 'Bajo', className: 'low', level: 'low' };
  return { label: 'OK', className: 'ok', level: 'ok' };
}

export function getStockBadgeClass(stock, minimo) {
  const { className } = getStockStatus(stock, minimo);
  return `stock-badge ${className}`;
}

export function getStockTagClass(stock, minimo) {
  const { className } = getStockStatus(stock, minimo);
  return `tag ${className}`;
}
