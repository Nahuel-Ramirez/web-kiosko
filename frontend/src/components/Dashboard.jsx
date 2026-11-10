import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getStockStatus, getStockTagClass } from '../utils/stock';
import { obtenerMisVentas } from '../services/turnoService';
import { fetchReportePeriodo } from '../services/reportService';
import { fetchHorasPico } from '../services/prediccionService';

const METODO_ETIQUETA = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia' };

export function Dashboard() {
  const {
    products,
    formatMoney,
    getLowStockProducts
  } = useApp();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Administrador';

  const [ventasHoy, setVentasHoy] = useState([]);
  const [resumenHoy, setResumenHoy] = useState({ cantidad: 0, total: 0 });
  const [ventasError, setVentasError] = useState('');
  const [recomendaciones, setRecomendaciones] = useState([]);

  // Ventas del día desde la API. El ADMIN ve el total de todos los cajeros
  // (reporte por período); el CAJERO, solo sus ventas.
  useEffect(() => {
    const hoy = new Date();
    let cancelado = false;
    const cargar = async () => {
      const fechaDesde = new Date();
      fechaDesde.setDate(fechaDesde.getDate() - 30);
      try {
        const misVentas = await obtenerMisVentas(hoy, hoy);
        // Las recomendaciones salen del reporte de horas pico, que es solo para el administrador.
        if (isAdmin) {
          try {
            const pico = await fetchHorasPico(fechaDesde.toISOString().split('T')[0], hoy.toISOString().split('T')[0]);
            if (!cancelado) setRecomendaciones(pico?.recomendaciones || []);
          } catch {
            if (!cancelado) setRecomendaciones([]);
          }
        }
        let resumen = {
          cantidad: misVentas.length,
          total: misVentas.reduce((sum, v) => sum + Number(v.total), 0)
        };
        if (isAdmin) {
          const reporte = await fetchReportePeriodo(hoy, hoy);
          resumen = { cantidad: reporte.cantidad_ventas, total: Number(reporte.total_general) };
        }
        if (!cancelado) {
          setVentasHoy(misVentas);
          setResumenHoy(resumen);
          setVentasError('');
        }
      } catch (err) {
        if (!cancelado) setVentasError(err.message || 'No se pudieron cargar las ventas del día.');
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [isAdmin]);

  const nombrePorId = Object.fromEntries(products.map(p => [p.id, p.name]));
  const lowStockProducts = getLowStockProducts();
  const recentSales = ventasHoy.slice(0, 4).map(venta => ({
    id: venta.id,
    items: venta.detalles
      .map(d => `${d.cantidad} x ${nombrePorId[d.producto_id] || `Producto ${d.producto_id}`}`)
      .join(', '),
    total: Number(venta.total),
    method: METODO_ETIQUETA[venta.metodo_pago] || venta.metodo_pago,
    time: new Date(venta.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }));

  const stats = [
    { label: 'Productos', value: products.length.toString() },
    { label: 'Stock critico', value: lowStockProducts.length.toString() },
    { label: 'Ventas del dia', value: resumenHoy.cantidad.toString() },
    { label: 'Facturacion', value: formatMoney(resumenHoy.total) }
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

      {recomendaciones.length > 0 && (
        <div className="recomendaciones-section">
          <h4 className="chart-title">Recomendaciones Inteligentes</h4>
          <div className="recomendaciones-grid scroll-y">
            {recomendaciones.map((rec, index) => (
              <div key={index} className={`recomendacion-card ${rec.tipo}`}>
                <div className="recomendacion-icon">
                  {rec.tipo === 'cajero' ? '👥' : '📦'}
                </div>
                <div className="recomendacion-content">
                  <strong>{rec.tipo === 'cajero' ? 'Refuerzo de Cajeros' : 'Alerta de Stock'}</strong>
                  <p>{rec.mensaje}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="content-grid two-columns">
        <div className="card">
          <div className="card-header">
            <h3>Alertas de stock</h3>
          </div>
          <ul id="lowStockList" className="item-list scroll-y">
            {lowStockProducts.length === 0 ? (
              <li><span className="empty-state">Sin alertas</span></li>
            ) : (
              lowStockProducts.map(item => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>Stock: {item.stock}</small>
                  </div>
                  <span className={getStockTagClass(item.stock, item.minStock)}>{getStockStatus(item.stock, item.minStock).label}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Mis ultimas ventas de hoy</h3>
          </div>
          {ventasError && <div className="form-message error">{ventasError}</div>}
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