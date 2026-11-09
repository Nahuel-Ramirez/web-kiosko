import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { fetchReportePeriodo, fetchReportePorUsuario, fetchUsuarios } from '../services/reportService';
import { fetchCurrentUser } from '../services/authService';

function escapePDF(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function descargarPDF(nombreArchivo, filas, encabezados) {
  const lineas = [encabezados.join(' | '), ...filas.map(fila => fila.map(celda => escapePDF(String(celda))).join(' | '))];

  let content = 'BT\n/F1 10 Tf\n50 750 Td\n';
  lineas.forEach((linea, i) => {
    content += `(${linea}) Tj\n`;
    if (i < lineas.length - 1) {
      content += '0 -15 Td\n';
    }
  });

  const obj1 = '1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n';
  const obj2 = '2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n';
  const obj3 = '3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>>>>>\nendobj\n';
  const obj4 = `4 0 obj\n<</Length ${content.length}>>\nstream\n${content}\nendstream\nendobj\n`;

  const header = '%PDF-1.4\n';
  const offsets = [];
  let offset = header.length;
  [obj1, obj2, obj3, obj4].forEach(obj => {
    offsets.push(offset);
    offset += obj.length;
  });
  const xrefStart = offset;

  let xref = 'xref\n0 5\n0000000000 65535 f \n';
  offsets.forEach(off => {
    xref += String(off).padStart(10, '0') + ' 00000 n \n';
  });
  const trailer = `trailer\n<</Size 5 /Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const pdf = header + obj1 + obj2 + obj3 + obj4 + xref + trailer;
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nombreArchivo}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export function Reportes() {
  const { currentUser, loading: authLoading } = useAuth();
  const { formatMoney } = useApp();
  const [reporte, setReporte] = useState(null);
  const [reporteUsuario, setReporteUsuario] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState('');
  const [fechaDesde, setFechaDesde] = useState(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy.toISOString().split('T')[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    return hoy.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = currentUser?.role === 'Administrador';

  useEffect(() => {
    if (!currentUser) return;
    if (isAdmin) {
      fetchUsuarios().then(setUsuarios).catch(() => {});
      return;
    }
    // El cajero solo puede ver su propio reporte: lo identificamos con /api/auth/me.
    fetchCurrentUser(currentUser.token)
      .then((usuario) => setSelectedUsuarioId(String(usuario.id)))
      .catch((err) => setError(err.message));
  }, [isAdmin, currentUser]);

  const cargarReporteGeneral = async () => {
    setLoading(true);
    setError('');
    try {
      const desde = new Date(`${fechaDesde}T00:00:00`);
      const hasta = new Date(`${fechaHasta}T23:59:59`);
      const data = await fetchReportePeriodo(desde, hasta);
      setReporte(data);
      setReporteUsuario(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarReporteUsuario = async () => {
    if (!selectedUsuarioId) return;
    setLoading(true);
    setError('');
    try {
      const desde = new Date(`${fechaDesde}T00:00:00`);
      const hasta = new Date(`${fechaHasta}T23:59:59`);
      const data = await fetchReportePorUsuario(selectedUsuarioId, desde, hasta);
      setReporteUsuario(data);
      setReporte(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // el reporte general es solo para ADMIN
    if (isAdmin && !selectedUsuarioId) {
      cargarReporteGeneral();
    }
  }, [fechaDesde, fechaHasta, isAdmin, selectedUsuarioId]);

  useEffect(() => {
    if (selectedUsuarioId) {
      cargarReporteUsuario();
    }
  }, [selectedUsuarioId, fechaDesde, fechaHasta]);

  if (authLoading) {
    return (
      <section id="reportesPanel" className="panel active-panel">
        <div className="empty-state">Cargando...</div>
      </section>
    );
  }

  return (
    <section id="reportesPanel" className="panel active-panel">
      <div className="card">
        <div className="card-header">
          <h3>Reportes de ventas</h3>
          {(reporte || reporteUsuario) && (
            <div className="header-actions">
              {reporte && (
                <button className="secondary-btn" onClick={() => {
                  const filas = reporte.por_usuario?.map(u => [
                    u.usuario_nombre, u.usuario_username, u.cantidad_ventas,
                    u.total_ventas, u.total_efectivo, u.total_tarjeta, u.total_transferencia ?? 0
                  ]) || [];
                  descargarPDF(
                    `reporte-general-${fechaDesde}_${fechaHasta}`,
                    filas,
                    ['Cajero', 'Usuario', 'Ventas', 'Total', 'Efectivo', 'Tarjeta', 'Transferencia']
                  );
                }}>
                  📄 Descargar Informe
                </button>
              )}
              {reporteUsuario && (
                <button className="secondary-btn" onClick={() => {
                  const filas = reporteUsuario.cierres?.map(c => [
                    new Date(c.fecha_cierre).toLocaleString('es-AR'),
                    c.total_efectivo, c.total_tarjeta, c.total_transferencia ?? 0, c.cantidad_ventas, c.observaciones || ''
                  ]) || [];
                  descargarPDF(
                    `reporte-${reporteUsuario.usuario_username}-${fechaDesde}_${fechaHasta}`,
                    filas,
                    ['Fecha', 'Efectivo', 'Tarjeta', 'Transferencia', 'Ventas', 'Observaciones']
                  );
                }}>
                  📄 Descargar Informe
                </button>
              )}
            </div>
          )}
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label>Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
            />
          </div>
          {isAdmin && (
            <div className="filter-group">
              <label>Cajero</label>
              <select value={selectedUsuarioId} onChange={e => setSelectedUsuarioId(e.target.value)}>
                <option value="">Todos los cajeros</option>
                {usuarios
                  .filter(u => u.rol === 'CAJERO')
                  .map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.username})</option>
                  ))}
              </select>
            </div>
          )}
          <div className="filter-group">
            <button
              className="primary-btn"
              onClick={selectedUsuarioId ? cargarReporteUsuario : cargarReporteGeneral}
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {error && <div className="form-message error">{error}</div>}

        {reporte && (
          <div className="reporte-container">
            <h4>Resumen general del período</h4>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="label">Total general</div>
                <div className="value">{formatMoney(reporte.total_general)}</div>
              </div>
              <div className="stat-card">
                <div className="label">Efectivo</div>
                <div className="value">{formatMoney(reporte.total_efectivo)}</div>
              </div>
              <div className="stat-card">
                <div className="label">Tarjeta</div>
                <div className="value">{formatMoney(reporte.total_tarjeta)}</div>
              </div>
              <div className="stat-card">
                <div className="label">Transferencia</div>
                <div className="value">{formatMoney(reporte.total_transferencia ?? 0)}</div>
              </div>
              <div className="stat-card">
                <div className="label">Cantidad de ventas</div>
                <div className="value">{reporte.cantidad_ventas}</div>
              </div>
            </div>

            {reporte.por_usuario && reporte.por_usuario.length > 0 && (
              <div className="reporte-por-usuario">
                <h4>Detalle por cajero</h4>
                <div className="table-wrapper">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Cajero</th>
                        <th>Ventas</th>
                        <th>Total</th>
                        <th>Efectivo</th>
                        <th>Tarjeta</th>
                        <th>Transferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.por_usuario.map(u => (
                        <tr key={u.usuario_id}>
                          <td><strong>{u.usuario_nombre}</strong> <small>({u.usuario_username})</small></td>
                          <td>{u.cantidad_ventas}</td>
                          <td>{formatMoney(u.total_ventas)}</td>
                          <td>{formatMoney(u.total_efectivo)}</td>
                          <td>{formatMoney(u.total_tarjeta)}</td>
                          <td>{formatMoney(u.total_transferencia ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {reporteUsuario && (
          <div className="reporte-container">
            <h4>Reporte de {reporteUsuario.usuario_nombre} ({reporteUsuario.usuario_username})</h4>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="label">Total ventas</div>
                <div className="value">{formatMoney(reporteUsuario.total_ventas)}</div>
              </div>
              <div className="stat-card">
                <div className="label">Cantidad</div>
                <div className="value">{reporteUsuario.cantidad_ventas}</div>
              </div>
              <div className="stat-card">
                <div className="label">Efectivo</div>
                <div className="value">{formatMoney(reporteUsuario.total_efectivo)}</div>
              </div>
              <div className="stat-card">
                <div className="label">Tarjeta</div>
                <div className="value">{formatMoney(reporteUsuario.total_tarjeta)}</div>
              </div>
              <div className="stat-card">
                <div className="label">Transferencia</div>
                <div className="value">{formatMoney(reporteUsuario.total_transferencia ?? 0)}</div>
              </div>
            </div>

            {reporteUsuario.cierres && reporteUsuario.cierres.length > 0 && (
              <div className="reporte-cierres">
                <h4>Cierres de caja</h4>
                <div className="table-wrapper">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Efectivo</th>
                        <th>Tarjeta</th>
                        <th>Transferencia</th>
                        <th>Ventas</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporteUsuario.cierres.map(c => (
                        <tr key={c.id}>
                          <td>{new Date(c.fecha_cierre).toLocaleString('es-AR')}</td>
                          <td>{formatMoney(c.total_efectivo)}</td>
                          <td>{formatMoney(c.total_tarjeta)}</td>
                          <td>{formatMoney(c.total_transferencia ?? 0)}</td>
                          <td>{c.cantidad_ventas}</td>
                          <td>{c.observaciones || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {!reporte && !reporteUsuario && !loading && (
          <div className="empty-state">No hay datos para el período seleccionado</div>
        )}
      </div>
    </section>
  );
}