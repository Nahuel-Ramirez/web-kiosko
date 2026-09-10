import { useApp } from '../context/AppContext';

export function Dashboard() {
  const {
    products,
    sales,
    formatMoney,
    getLowStockProducts,
    getSalesTotal
  } = useApp();

  const lowStockProducts = getLowStockProducts();
  const recentSales = sales.slice(0, 4);

  const stats = [
    { label: 'Productos', value: products.length.toString() },
    { label: 'Stock critico', value: lowStockProducts.length.toString() },
    { label: 'Ventas del dia', value: sales.length.toString() },
    { label: 'Facturacion', value: formatMoney(getSalesTotal()) }
  ];

  return (
    <section id="dashboardPanel" className="panel active-panel">
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <span className="label">{stat.label}</span>
            <span className="value">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="content-grid two-columns">
        <div className="card">
          <div className="card-header">
            <h3>Alertas de stock</h3>
          </div>
          <ul id="lowStockList" className="item-list">
            {lowStockProducts.length === 0 ? (
              <li><span className="empty-state">Sin alertas</span></li>
            ) : (
              lowStockProducts.map(item => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>Stock: {item.stock}</small>
                  </div>
                  <span className="tag warning">Bajo</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Ultimas ventas</h3>
          </div>
          <ul id="salesList" className="item-list">
            {recentSales.map(sale => (
              <li key={sale.id}>
                <div>
                  <strong>{sale.items}</strong>
                  <small>{sale.time}</small>
                </div>
                <div>
                  <strong>{formatMoney(sale.total)}</strong>
                  <small>{sale.method}</small>
                </div>
              </li>
            ))}
            {recentSales.length === 0 && (
              <li><span className="empty-state">Sin ventas recientes</span></li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}