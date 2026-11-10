import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { obtenerCuentaFiado, registrarPagoFiado } from '../services/fiadoService';

function estadoDeuda(saldo, limite) {
  if (saldo > limite) return { label: 'Supera el límite', className: 'critical' };
  if (saldo === limite) return { label: 'En el límite', className: 'critical' };
  if (saldo >= limite * 0.8) return { label: 'Cerca del límite', className: 'low' };
  return { label: 'Dentro del límite', className: 'ok' };
}

function formatFecha(valor) {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export function Fiados() {
  const { deudores, deudoresError, cargarDeudores, getFiadoAlertas, formatMoney } = useApp();

  const [cuenta, setCuenta] = useState(null);
  const [cuentaCargando, setCuentaCargando] = useState(false);
  const [monto, setMonto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    cargarDeudores();
  }, [cargarDeudores]);

  const alertas = getFiadoAlertas();
  const totalAdeudado = deudores.reduce((sum, deudor) => sum + Number(deudor.saldo), 0);

  const cargarCuenta = async (clienteId) => {
    const datos = await obtenerCuentaFiado(clienteId);
    setCuenta(datos);
    setMonto(String(Number(datos.saldo)));
    setObservaciones('');
  };

  const handleVerCuenta = async (clienteId) => {
    setCuentaCargando(true);
    setError('');
    setMensaje('');
    try {
      await cargarCuenta(clienteId);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la cuenta del cliente.');
    } finally {
      setCuentaCargando(false);
    }
  };

  const handlePago = async (e) => {
    e.preventDefault();
    if (!cuenta) return;
    setPagando(true);
    setError('');
    setMensaje('');
    try {
      const pago = await registrarPagoFiado(cuenta.cliente_id, monto, observaciones.trim());
      setMensaje(`Pago de ${formatMoney(Number(pago.monto))} registrado. Queda debiendo ${formatMoney(Number(pago.saldo))}.`);
      await Promise.all([cargarCuenta(cuenta.cliente_id), cargarDeudores()]);
    } catch (err) {
      setError(err.message || 'No se pudo registrar el pago.');
    } finally {
      setPagando(false);
    }
  };

  const saldoCuenta = cuenta ? Number(cuenta.saldo) : 0;

  return (
    <section id="fiadosPanel" className="panel active-panel">
      <div className="content-grid two-columns fiados-grid">
        <div className="card">
          <div className="card-header">
            <h3>Clientes que deben</h3>
            <strong>{formatMoney(totalAdeudado)}</strong>
          </div>
          {deudoresError && <div className="form-message error">{deudoresError}</div>}
          {alertas.length > 0 && (
            <div className="form-message error fiado-alerta">
              {alertas.length === 1 ? '1 cliente llegó' : `${alertas.length} clientes llegaron`} al límite de fiado:{' '}
              {alertas.map(deudor => deudor.razon_social).join(', ')}.
            </div>
          )}
          {deudores.length === 0 && !deudoresError ? (
            <div className="empty-state">Ningún cliente debe plata.</div>
          ) : (
            <div className="table-wrapper scroll-y">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Debe / límite</th>
                    <th>Último fiado</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {deudores.map(deudor => {
                    const saldo = Number(deudor.saldo);
                    const limite = Number(deudor.limite_fiado);
                    const estado = estadoDeuda(saldo, limite);
                    return (
                      <tr key={deudor.cliente_id} className={cuenta?.cliente_id === deudor.cliente_id ? 'fila-seleccionada' : ''}>
                        <td>
                          <strong>{deudor.razon_social}</strong>
                          <br />
                          <small>{deudor.dni_cuit}{deudor.telefono ? ` · ${deudor.telefono}` : ''}</small>
                        </td>
                        <td>
                          <strong>{formatMoney(saldo)}</strong>
                          <br />
                          <small>de {formatMoney(limite)}</small>
                        </td>
                        <td><small>{formatFecha(deudor.ultimo_fiado)}</small></td>
                        <td>
                          <span className={`stock-badge ${estado.className}`}>{estado.label}</span>
                          {!deudor.activo && <><br /><small>Dado de baja</small></>}
                        </td>
                        <td>
                          <button
                            className="mini-btn edit-btn"
                            onClick={() => handleVerCuenta(deudor.cliente_id)}
                            disabled={cuentaCargando || pagando}
                          >
                            Registrar pago
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>{cuenta ? `Cuenta de ${cuenta.razon_social}` : 'Cuenta del cliente'}</h3>
          </div>
          {error && <div className="form-message error">{error}</div>}
          {mensaje && <div className="form-message success">{mensaje}</div>}

          {!cuenta ? (
            <div className="empty-state">
              {cuentaCargando ? 'Cargando cuenta...' : 'Elegí "Registrar pago" en un cliente para ver su cuenta y cobrarle.'}
            </div>
          ) : (
            <>
              <div className="cierre-resumen">
                <div className="cierre-row">
                  <span>Debe</span>
                  <strong>{formatMoney(saldoCuenta)}</strong>
                </div>
                <div className="cierre-row">
                  <span>Límite de fiado</span>
                  <strong>{formatMoney(Number(cuenta.limite_fiado))}</strong>
                </div>
                <div className="cierre-row total">
                  <span>Disponible</span>
                  <strong>{formatMoney(Number(cuenta.disponible))}</strong>
                </div>
              </div>

              <form className="product-form" onSubmit={handlePago}>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="pagoMonto">Monto del pago <span className="required">*</span></label>
                    <input
                      id="pagoMonto"
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={saldoCuenta}
                      value={monto}
                      onChange={(e) => { setMonto(e.target.value); setError(''); }}
                      disabled={saldoCuenta <= 0}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="pagoObs">Observaciones</label>
                    <input
                      id="pagoObs"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Ej: pagó en efectivo"
                      disabled={saldoCuenta <= 0}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="primary-btn full" disabled={pagando || saldoCuenta <= 0}>
                    {pagando ? 'Registrando...' : saldoCuenta <= 0 ? 'No debe nada' : 'Registrar pago'}
                  </button>
                </div>
              </form>

              <h4 className="fiado-subtitulo">Movimientos</h4>
              {cuenta.movimientos.length === 0 ? (
                <div className="empty-state">Sin movimientos.</div>
              ) : (
                <div className="table-wrapper scroll-y">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Monto</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuenta.movimientos.map(mov => (
                        <tr key={mov.id}>
                          <td><small>{formatFecha(mov.fecha)}</small></td>
                          <td>
                            <span className={`stock-badge ${mov.tipo === 'VENTA' ? 'low' : 'ok'}`}>
                              {mov.tipo === 'VENTA' ? 'Fiado' : 'Pago'}
                            </span>
                          </td>
                          <td>
                            <strong>{mov.tipo === 'VENTA' ? '+' : '-'}{formatMoney(Number(mov.monto))}</strong>
                          </td>
                          <td><small>{mov.venta_id ? `Venta #${mov.venta_id}` : (mov.observaciones || '-')}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
