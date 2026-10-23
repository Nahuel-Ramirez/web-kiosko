import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { fetchVentasPorHora, fetchHorasPico } from '../services/prediccionService';
import { HourlySalesChart } from './Charts/HourlySalesChart';
import { PeakHoursChart } from './Charts/PeakHoursChart';

function descargarCSV(nombreArchivo, filas, encabezados) {
  const csv = [
    encabezados.join(','),
    ...filas.map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nombreArchivo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function PrediccionDemanda() {
  const { currentUser, loading: authLoading } = useAuth();
  const { formatMoney } = useApp();
  const [ventasHora, setVentasHora] = useState(null);
  const [horasPico, setHorasPico] = useState(null);
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [fechaDesde, setFechaDesde] = useState(() => {
    const hoy = new Date();
    hoy.setDate(hoy.getDate() - 30);
    return hoy.toISOString().split('T')[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = currentUser?.role === 'Administrador';

  const cargarDatos = async () => {
    setLoading(true);
    setError('');
    try {
      const [ventasData, picoData] = await Promise.all([
        fetchVentasPorHora(fechaDesde, fechaHasta),
        fetchHorasPico(fechaDesde, fechaHasta),
      ]);
      setVentasHora(ventasData);
      setHorasPico(picoData);
      setRecomendaciones(picoData?.recomendaciones || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [fechaDesde, fechaHasta]);

  const handleDescargarVentasHora = () => {
    if (!ventasHora?.por_hora?.length) return;
    const filas = ventasHora.por_hora.map((item) => [
      `${item.hora.toString().padStart(2, '0')}:00`,
      item.ventas,
      item.total,
      item.items_top || '-',
    ]);
    descargarCSV(
      `ventas-por-hora-${fechaDesde}_${fechaHasta}`,
      filas,
      ['Hora', 'Ventas', 'Total', 'Productos Top']
    );
  };

  const handleDescargarHorasPico = () => {
    if (!horasPico?.horas_pico?.length) return;
    const filas = horasPico.horas_pico.map((item) => [
      `${item.hora_inicio}:00-${item.hora_fin}:00`,
      item.ventas_esperadas,
      item.motivo || 'Pico detectado',
    ]);
    descargarCSV(
      `horas-pico-${fechaDesde}_${fechaHasta}`,
      filas,
      ['Período', 'Ventas Esperadas', 'Motivo']
    );
  };

  const handleDescargarRecomendaciones = () => {
    if (!recomendaciones?.length) return;
    const filas = recomendaciones.map((r) => [
      r.tipo === 'cajero' ? 'Cajero' : 'Stock',
      r.mensaje,
    ]);
    descargarCSV(
      `recomendaciones-${fechaDesde}_${fechaHasta}`,
      filas,
      ['Tipo', 'Recomendación']
    );
  };

  if (!isAdmin) {
    return (
      <section id="prediccionPanel" className="panel active-panel">
        <div className="card">
          <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
            <h3>Acceso restringido</h3>
            <p>Solo los administradores pueden acceder a la predicción de demanda.</p>
          </div>
        </div>
      </section>
    );
  }

  if (authLoading) {
    return (
      <section id="prediccionPanel" className="panel active-panel">
        <div className="empty-state">Cargando...</div>
      </section>
    );
  }

  return (
    <section id="prediccionPanel" className="panel active-panel">
      <div className="card">
        <div className="card-header">
          <h3>Predicción de Demanda y Horas Pico</h3>
          <div className="header-actions">
            {ventasHora && (
              <button className="secondary-btn" onClick={handleDescargarVentasHora} disabled={loading}>
                📥 Ventas por Hora (CSV)
              </button>
            )}
            {horasPico && (
              <button className="secondary-btn" onClick={handleDescargarHorasPico} disabled={loading}>
                📥 Horas Pico (CSV)
              </button>
            )}
            {recomendaciones.length > 0 && (
              <button className="secondary-btn" onClick={handleDescargarRecomendaciones} disabled={loading}>
                📥 Recomendaciones (CSV)
              </button>
            )}
            <button className="primary-btn" onClick={cargarDatos} disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label>Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              max={fechaHasta}
            />
          </div>
          <div className="filter-group">
            <label>Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              min={fechaDesde}
            />
          </div>
        </div>

        {error && <div className="form-message error">{error}</div>}

        {loading && (
          <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem', width: '2rem', height: '2rem', border: '3px solid var(--line)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p>Analizando datos históricos...</p>
          </div>
        )}

        {!loading && !ventasHora && !horasPico && (
          <div className="empty-state">No hay datos para el período seleccionado</div>
        )}

        {ventasHora && <HourlySalesChart data={ventasHora} />}

        {horasPico && <PeakHoursChart data={horasPico} />}

        {recomendaciones.length > 0 && (
          <div className="recomendaciones-section">
            <h4 className="chart-title">Recomendaciones Inteligentes</h4>
            <div className="recomendaciones-grid">
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

        {!ventasHora && !horasPico && !loading && (
          <div className="empty-state">No hay datos para el período seleccionado</div>
        )}
      </div>
    </section>
  );
}