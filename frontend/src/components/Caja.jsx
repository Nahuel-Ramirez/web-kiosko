import { useState, Fragment, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getStockStatus, getStockTagClass } from '../utils/stock';
import { TicketVentaModal } from './TicketVenta';
import { BarcodeInput } from './ui/BarcodeInput';
import { ProductSearchInput } from './ui/ProductSearchInput';
import { ClienteSelectorModal } from './ui/ClienteSelectorModal';
import { buscarProductoPorCodigo } from '../services/productosService';
import { obtenerCuentaFiado } from '../services/fiadoService';

const CONSUMIDOR_FINAL_ID = 1;

export function Caja() {
  const { currentUser } = useAuth();
  const {
    products,
    productsLoading,
    productsError,
    loadProducts,
    cart,
    searchTerm,
    setSearchTerm,
    cashReceived,
    paymentMethod,
    setPaymentMethod,
    formatMoney,
    addToCart,
    updateCartQuantity,
    getCartSubtotal,
    getCartDiscount,
    handleCheckout,
    cancelSale,
    updateCashReceived,
    getTotalesDelTurno,
    crearCierre,
    cargarDeudores
  } = useApp();

  const [cierreLoading, setCierreLoading] = useState(false);
  const [cierreError, setCierreError] = useState('');
  const [cierreExito, setCierreExito] = useState(false);
  // Arqueo: con cuánto arrancó la caja y cuánto efectivo contó el cajero al cerrar.
  const [montoInicial, setMontoInicial] = useState('');
  const [efectivoContado, setEfectivoContado] = useState('');
  const [ultimoCierre, setUltimoCierre] = useState(null);
  const [lastSale, setLastSale] = useState(null);
  const [showTicket, setShowTicket] = useState(false);
  const [turnoTotales, setTurnoTotales] = useState({
    totalEfectivo: 0,
    totalTarjeta: 0,
    totalTransferencia: 0,
    totalFiado: 0,
    totalCobrosFiado: 0,
    cantidadCobrosFiado: 0,
    cantidad: 0,
    totalGeneral: 0
  });
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [ventaError, setVentaError] = useState('');
  const [scanMensaje, setScanMensaje] = useState('');
  const [cuentaFiado, setCuentaFiado] = useState(null);
  const [cuentaError, setCuentaError] = useState('');

  const esFiado = paymentMethod === 'Fiado';
  const clienteFiadoId = clienteSeleccionado && clienteSeleccionado.id !== CONSUMIDOR_FINAL_ID
    ? clienteSeleccionado.id
    : null;

  // Con "Fiado" se trae lo que debe el cliente para avisar antes de cobrar si se pasa del límite.
  useEffect(() => {
    if (!esFiado || !clienteFiadoId) {
      setCuentaFiado(null);
      setCuentaError('');
      return undefined;
    }
    let vigente = true;
    obtenerCuentaFiado(clienteFiadoId)
      .then(cuenta => { if (vigente) { setCuentaFiado(cuenta); setCuentaError(''); } })
      .catch(err => { if (vigente) { setCuentaFiado(null); setCuentaError(err.message); } });
    return () => { vigente = false; };
  }, [esFiado, clienteFiadoId]);

  const cargarTotalesTurno = async () => {
    try {
      const totales = await getTotalesDelTurno();
      setTurnoTotales(totales);
    } catch (err) {
      setCierreError(err.message || 'No se pudieron cargar los totales del turno.');
    }
  };

  useEffect(() => {
    cargarTotalesTurno();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enter en el buscador: primero busca el código exacto en la API; si no existe y el
  // texto coincide con un único producto del catálogo, agrega ese.
  const handleBarcodeScan = async (code) => {
    setScanMensaje('');
    let product = null;
    try {
      product = await buscarProductoPorCodigo(code);
    } catch {
      const term = code.toLowerCase();
      const coincidencias = products.filter(p =>
        p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term)
      );
      if (coincidencias.length === 1) product = coincidencias[0];
    }
    if (!product) {
      setScanMensaje(`Producto no encontrado: ${code}`);
    } else if (product.stock <= 0) {
      setScanMensaje(`"${product.name}" no tiene stock.`);
    } else {
      addToCart(product.id);
      setSearchTerm('');
    }
  };

  const handleSelectCliente = (cliente) => {
    setClienteSeleccionado(cliente);
};

  const filteredProducts = products.filter(product => {
    const term = (searchTerm || '').toLowerCase();
    if (!term) return true;
    return (
      product.name.toLowerCase().includes(term) ||
      product.code.toLowerCase().includes(term) ||
      (product.category && product.category.toLowerCase().includes(term))
    );
  });

  const subtotal = getCartSubtotal();
  const discount = getCartDiscount();
  const total = subtotal - discount;
  const received = Number(cashReceived || 0);
  const change = Math.max(received - total, 0);

  let fiadoBloqueo = '';
  if (esFiado && !clienteFiadoId) {
    fiadoBloqueo = 'Para fiar elegí un cliente: a Consumidor Final no se le fía.';
  } else if (esFiado && cuentaError) {
    fiadoBloqueo = cuentaError;
  } else if (esFiado && cuentaFiado && !cuentaFiado.activo) {
    fiadoBloqueo = 'El cliente está dado de baja y no puede llevar fiado.';
  } else if (esFiado && cuentaFiado && total > Number(cuentaFiado.disponible)) {
    fiadoBloqueo = `Supera el límite de fiado: le quedan ${formatMoney(Number(cuentaFiado.disponible))} disponibles y la venta es de ${formatMoney(total)}.`;
  }
  const esperandoCuenta = esFiado && clienteFiadoId && !cuentaFiado && !cuentaError;

  const {
    totalEfectivo, totalTarjeta, totalTransferencia, totalFiado, totalCobrosFiado, cantidadCobrosFiado, cantidad, totalGeneral
  } = turnoTotales;
  const turnoVacio = cantidad === 0 && !cantidadCobrosFiado;

  // Efectivo que debería haber en caja: monto inicial + ventas en efectivo + cobros de deudas de fiado.
  const efectivoEsperado = Number(montoInicial || 0) + totalEfectivo + (totalCobrosFiado || 0);

  const handleCierre = async () => {
    if (turnoVacio) {
      setCierreError('No hay ventas ni cobros de fiado en este turno para cerrar');
      return;
    }
    if (efectivoContado === '' || Number(efectivoContado) < 0 || Number(montoInicial || 0) < 0) {
      setCierreError('Para cerrar la caja ingresá el efectivo contado (y el monto inicial, si hubo).');
      return;
    }
    if (!window.confirm(`¿Cerrar caja?\nEfectivo: ${formatMoney(totalEfectivo)}\nTarjeta: ${formatMoney(totalTarjeta)}\nTransferencia: ${formatMoney(totalTransferencia)}\nFiado (no entra en caja): ${formatMoney(totalFiado)}\nCobros de fiado (efectivo): ${formatMoney(totalCobrosFiado || 0)}\nVentas: ${cantidad}\nTotal: ${formatMoney(totalGeneral)}\n\nMonto inicial: ${formatMoney(Number(montoInicial || 0))}\nEfectivo contado: ${formatMoney(Number(efectivoContado))}`)) {
      return;
    }
    setCierreLoading(true);
    setCierreError('');
    setCierreExito(false);
    setUltimoCierre(null);
    try {
      const cierre = await crearCierre({ montoInicial, efectivoContado });
      setUltimoCierre(cierre);
      setCierreExito(true);
      setMontoInicial('');
      setEfectivoContado('');
    } catch (err) {
      setCierreError(err.message);
    } finally {
      setCierreLoading(false);
      cargarTotalesTurno();
    }
  };

  const handleCheckoutWithTicket = async () => {
    if (!cart.length || cobrando || fiadoBloqueo || esperandoCuenta) return;
    setVentaError('');
    setCobrando(true);

    const itemsTexto = cart.map(item => `${item.quantity} x ${item.name}`).join(', ');
    try {
      const venta = await handleCheckout(clienteSeleccionado?.id || 1);
      setLastSale({
        id: venta.id,
        items: itemsTexto,
        total: Number(venta.total),
        fecha: venta.fecha,
        cajero: currentUser?.nombre || 'Cajero',
        cliente: clienteSeleccionado || { id: 1, nombre: 'Consumidor Final', dni: '0', cuit: '0' },
        metodo_pago: venta.metodo_pago,
        monto_recibido: Number(venta.monto_recibido),
        vuelto: Number(venta.vuelto),
        subtotal,
        descuento: discount,
        cliente_id: venta.cliente_id,
      });
      setShowTicket(true);
      setClienteSeleccionado(null);
      cargarTotalesTurno();
      if (venta.metodo_pago === 'FIADO') cargarDeudores();
    } catch (err) {
      // 409 (sin stock) o 400: se muestra el motivo y el carrito queda como estaba.
      setVentaError(err.message || 'No se pudo registrar la venta.');
      loadProducts();
    } finally {
      setCobrando(false);
    }
  };

  return (
    <Fragment>
      <section id="cajaPanel" className="panel active-panel">
        <div className="content-grid two-columns checkout-grid">
          <div className="card checkout-panel">
            <div className="card-header">
              <h3>Punto de venta</h3>
              <div className="search-box">
                <BarcodeInput
                  onScan={handleBarcodeScan}
                  placeholder="Escanee código de barras..."
                  autoFocus
                />
                <ProductSearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar por nombre, código o categoría..."
                />
              </div>
            </div>
            {scanMensaje && <div className="form-message error">{scanMensaje}</div>}
            {productsError && <div className="form-message error">{productsError}</div>}
            <div id="catalogGrid" className="catalog-grid scroll-y">
              {productsLoading && products.length === 0 ? (
                <div className="empty-state">Cargando productos...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="empty-state">No se encontraron productos.</div>
              ) : (
                filteredProducts.map(product => (
                  <div key={product.id} className="product-card">
                    <div>
                      <h4>{product.name}</h4>
                      <div className="product-meta">
                        <span><code>{product.code}</code></span>
                        <span>{product.stock} uds.</span>
                      </div>
                    </div>
                    <div className="price">{formatMoney(product.price)}</div>
                    <div className="action-row">
                      <span className={getStockTagClass(product.stock, product.minStock)}>
                        {getStockStatus(product.stock, product.minStock).label}
                      </span>
                      <button
                        data-add-product={product.id}
                        onClick={() => addToCart(product.id)}
                        disabled={product.stock <= 0}
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card cart-panel">
            <div className="card-header">
              <h3>Carrito</h3>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowClienteModal(true)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                👤 {clienteSeleccionado?.nombre || 'Consumidor Final'}
              </button>
            </div>
            <div id="cartItems" className="cart-items scroll-y">
              {cart.length === 0 ? (
                <div className="empty-state">El carrito esta vacio.</div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div>
                      <h4>{item.name}</h4>
                      <small>{formatMoney(item.price)} c/u</small>
                      <div className="qty-controls">
                        <button
                          className="qty-btn minus"
                          onClick={() => updateCartQuantity(item.id, -1)}
                          aria-label="Disminuir"
                          disabled={item.quantity <= 1}
                        >−</button>
                        <span className="qty-value">{item.quantity}</span>
                        <button
                          className="qty-btn plus"
                          onClick={() => updateCartQuantity(item.id, 1)}
                          aria-label="Aumentar"
                          disabled={item.quantity >= item.stock}
                        >+</button>
                        <input
                          type="number"
                          className="qty-input"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(parseInt(e.target.value) || 1, item.stock));
                            updateCartQuantity(item.id, val - item.quantity);
                          }}
                          min="1"
                          max={item.stock}
                          style={{ width: '50px', textAlign: 'center' }}
                        />
                      </div>
                    </div>
                    <div className="item-total">{formatMoney(item.price * item.quantity)}</div>
                  </div>
                ))
              )}
            </div>

            <div className="totals">
              <div><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
              <div><span>Descuento</span><strong>-{formatMoney(discount)}</strong></div>
              <div className="total-line"><span>Total</span><strong>{formatMoney(total)}</strong></div>
            </div>

            <div className="payment-box">
              <label>
                Medio de pago
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Fiado">Fiado</option>
                </select>
              </label>
              {esFiado ? (
                cuentaFiado && (
                  <div className="fiado-box">
                    <div className="cierre-row">
                      <span>{cuentaFiado.razon_social} debe</span>
                      <strong>{formatMoney(Number(cuentaFiado.saldo))}</strong>
                    </div>
                    <div className="cierre-row">
                      <span>Límite de fiado</span>
                      <strong>{formatMoney(Number(cuentaFiado.limite_fiado))}</strong>
                    </div>
                    <div className="cierre-row total">
                      <span>Disponible</span>
                      <strong>{formatMoney(Number(cuentaFiado.disponible))}</strong>
                    </div>
                  </div>
                )
              ) : (
                <>
                  <label>
                    Monto recibido
                    <input
                      id="cashReceived"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={paymentMethod === 'Efectivo' ? cashReceived : ''}
                      onChange={(e) => updateCashReceived(e.target.value)}
                      disabled={paymentMethod !== 'Efectivo'}
                    />
                  </label>
                  <div className="change-box">
                    <span>Vuelto</span>
                    <strong>{formatMoney(change)}</strong>
                  </div>
                </>
              )}
            </div>

            {fiadoBloqueo && <div className="form-message error">{fiadoBloqueo}</div>}
            {ventaError && <div className="form-message error">{ventaError}</div>}

            <div className="cart-actions">
              <button id="cancelSaleBtn" className="secondary-btn full" onClick={() => { cancelSale(); setVentaError(''); }} disabled={cobrando}>Cancelar</button>
              <button
                id="checkoutBtn"
                className="primary-btn full"
                onClick={handleCheckoutWithTicket}
                disabled={cart.length === 0 || cobrando || Boolean(fiadoBloqueo) || Boolean(esperandoCuenta)}
              >
                {cobrando ? 'Registrando...' : esFiado ? 'Anotar fiado' : 'Cobrar'}
              </button>
            </div>

            <div className="cierre-section">
              <div className="card-header">
                <h3>Cierre de caja (Turno actual)</h3>
              </div>
              <div className="cierre-resumen">
                <div className="cierre-row">
                  <span>Ventas en este turno</span>
                  <strong>{cantidad}</strong>
                </div>
                <div className="cierre-row">
                  <span>Efectivo</span>
                  <strong>{formatMoney(totalEfectivo)}</strong>
                </div>
                <div className="cierre-row">
                  <span>Tarjeta</span>
                  <strong>{formatMoney(totalTarjeta)}</strong>
                </div>
                <div className="cierre-row">
                  <span>Transferencia</span>
                  <strong>{formatMoney(totalTransferencia)}</strong>
                </div>
                {totalFiado > 0 && (
                  <div className="cierre-row">
                    <span>Fiado (no entra en caja)</span>
                    <strong>{formatMoney(totalFiado)}</strong>
                  </div>
                )}
                {cantidadCobrosFiado > 0 && (
                  <div className="cierre-row">
                    <span>Cobros de fiado en efectivo ({cantidadCobrosFiado})</span>
                    <strong>{formatMoney(totalCobrosFiado)}</strong>
                  </div>
                )}
                <div className="cierre-row total">
                  <span>Total</span>
                  <strong>{formatMoney(totalGeneral)}</strong>
                </div>
              </div>
              <div className="payment-box">
                <label>
                  Monto inicial en caja
                  <input
                    id="montoInicial"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={montoInicial}
                    onChange={(e) => { setMontoInicial(e.target.value); setCierreError(''); }}
                  />
                </label>
                <label>
                  Efectivo contado <span className="required">*</span>
                  <input
                    id="efectivoContado"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={efectivoContado}
                    onChange={(e) => { setEfectivoContado(e.target.value); setCierreError(''); }}
                  />
                </label>
                <div className="change-box">
                  <span>Efectivo esperado</span>
                  <strong>{formatMoney(efectivoEsperado)}</strong>
                </div>
              </div>
              {cierreError && <div className="form-message error">{cierreError}</div>}
              {cierreExito && (
                <div className="form-message success">
                  Caja cerrada correctamente.
                  {ultimoCierre && ultimoCierre.diferencia !== null && ultimoCierre.diferencia !== undefined && (
                    <> Diferencia del arqueo: {formatMoney(Number(ultimoCierre.diferencia))}{' '}
                      ({Number(ultimoCierre.diferencia) < 0 ? 'faltante' : Number(ultimoCierre.diferencia) > 0 ? 'sobrante' : 'sin diferencia'}).</>
                  )}
                </div>
              )}
              <button
                className="primary-btn full cierre-btn"
                onClick={handleCierre}
                disabled={turnoVacio || cierreLoading || efectivoContado === ''}
              >
                {cierreLoading ? 'Cerrando...' : 'Cerrar caja'}
              </button>
            </div>
          </div>
        </div>
      </section>
      <TicketVentaModal
        venta={lastSale}
        isOpen={showTicket}
        onClose={() => setShowTicket(false)}
        onPrint={() => window.print()}
      />
      <ClienteSelectorModal
        isOpen={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        onSelect={handleSelectCliente}
        initialClient={clienteSeleccionado}
      />
    </Fragment>
  );
}