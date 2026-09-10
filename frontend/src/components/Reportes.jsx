import { useApp } from '../context/AppContext';

export function Reportes() {
  const {
    getTopProducts,
    sales,
    formatMoney,
    getLowStockProducts,
    getSalesTotal
  } = useApp();

  const topProducts = getTopProducts();
  const totalCash = sales
    .filter(sale => sale.method === 'Efectivo')
    .reduce((sum, sale) => sum + sale.total, 0);
  const totalCard = sales
    .filter(sale => sale.method === 'Tarjeta')
    .reduce((sum, sale) => sum + sale.total, 0);

  return (
    <section id="reportesPanel" className="panel active-panel">
      <div className="content-grid two-columns">
        <div className="card">
          <div className="card-header">
            <h3>Productos mas vendidos</h3>
          </div>
          <ul id="topProductsList" className="item-list">
            {topProducts.map((item, index) => (
              <li key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.qty} ventas</small>
                </div>
                <span className="tag success">#{index + 1}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Cierre de caja</h3>
          </div>
          <div id="cashCloseSummary" className="cash-summary">
            <div className="summary-row"><span>Ventas en efectivo</span><strong>{formatMoney(totalCash)}</strong></div>
            <div className="summary-row"><span>Ventas con tarjeta</span><strong>{formatMoney(totalCard)}</strong></div>
            <div className="summary-row"><span>Total de ventas</span><strong>{formatMoney(getSalesTotal())}</strong></div>
            <div className="summary-row"><span>Productos con stock critico</span><strong>{getLowStockProducts().length}</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}