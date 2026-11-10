// El estado depende del stock mínimo de cada producto (productos.stock_minimo):
// en el mínimo o por debajo es "Crítico" (entra en las alertas); hasta el doble, "Bajo".
export function getStockStatus(stock, minimo = 5) {
  if (stock <= 0) return { label: 'Sin stock', className: 'empty', level: 'empty' };
  if (stock <= minimo) return { label: 'Crítico', className: 'critical', level: 'critical' };
  if (stock <= minimo * 2) return { label: 'Bajo', className: 'low', level: 'low' };
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
