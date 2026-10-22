export function getStockStatus(stock) {
  if (stock <= 0) return { label: 'Sin stock', className: 'empty', level: 'empty' };
  if (stock < 50) return { label: 'Crítico', className: 'critical', level: 'critical' };
  if (stock <= 100) return { label: 'Bajo', className: 'low', level: 'low' };
  return { label: 'OK', className: 'ok', level: 'ok' };
}

export function getStockBadgeClass(stock) {
  const { className } = getStockStatus(stock);
  return `stock-badge ${className}`;
}

export function getStockTagClass(stock) {
  const { className } = getStockStatus(stock);
  return `tag ${className}`;
}