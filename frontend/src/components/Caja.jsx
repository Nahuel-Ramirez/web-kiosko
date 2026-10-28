import { useState, Fragment, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getStockStatus, getStockTagClass } from '../utils/stock';
import { TicketVentaModal } from './TicketVenta';
import { BarcodeInput } from './ui/BarcodeInput';
import { ClienteSelectorModal } from './ui/ClienteSelectorModal';
import { buscarProductoPorCodigo } from '../services/productosService';

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
    crearCierre
  } = useApp();

  const [cierreLoading, setCierreLoading] = useState(false);
  const [cierreError, setCierreError] = useState('');
  const [cierreExito, setCierreExito] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showTicket, setShowTicket] = useState(false);
  const [turnoTotales, setTurnoTotales] = useState({
    totalEfectivo: 0,
    totalTarjeta: 0,
    totalTransferencia: 0,
    cantidad: 0,
    totalGeneral: 0
  });
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [ventaError, setVentaError] = useState('');
  const [scanMensaje, setScanMensaje] = useState('');

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
    const term = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(term) ||
      product.code.toLowerCase().includes(term)
    );
  });

  const subtotal = getCartSubtotal();
  const discount = getCartDiscount();
  const total = subtotal - discount;
  const received = Number(cashReceived || 0);
  const change = Math.max(received - total, 0);

  const { totalEfectivo, totalTarjeta, totalTransferencia, cantidad, totalGeneral } = turnoTotales;

  const handleCierre = async () => {
    if (cantidad === 0) {
      setCierreError('No hay ventas en este turno para cerrar');
      return;
    }
    if (!window.confirm(`¿Cerrar caja?\nEfectivo: ${formatMoney(totalEfectivo)}\nTarjeta: ${formatMoney(totalTarjeta)}\nTransferencia: ${formatMoney(totalTransferencia)}\nVentas: ${cantidad}\nTotal: ${formatMoney(totalGeneral)}`)) {
      return;
    }
    setCierreLoading(true);
    setCierreError('');
    setCierreExito(false);
    try {
      await crearCierre();
      setCierreExito(true);
      setTimeout(() => setCierreExito(false), 3000);
    } catch (err) {
      setCierreError(err.message);
    } finally {
      setCierreLoading(false);
      cargarTotalesTurno();
    }
  };

  const handleCheckoutWithTicket = async () => {
    if (!cart.length || cobrando) return;
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
        cliente: clienteSeleccionado?.nombre || 'Consumidor Final',
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
                  onChange={(value) => { setSearchTerm(value); setScanMensaje(''); }}
                  placeholder="Escanee código de barras o busque producto..."
                  autoFocus
                />
              </div>
            </div>
            {scanMensaje && <div className="form-message error">{scanMensaje}</div>}
            {productsError && <div className="form-message error">{productsError}</div>}
            <div id="catalogGrid" className="catalog-grid">
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
                      <span className={getStockTagClass(product.stock)}>
                        {getStockStatus(product.stock).label}
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
            <div id="cartItems" className="cart-items">
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
                </select>
              </label>
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
            </div>

            {ventaError && <div className="form-message error">{ventaError}</div>}

            <div className="cart-actions">
              <button id="cancelSaleBtn" className="secondary-btn full" onClick={() => { cancelSale(); setVentaError(''); }} disabled={cobrando}>Cancelar</button>
              <button id="checkoutBtn" className="primary-btn full" onClick={handleCheckoutWithTicket} disabled={cart.length === 0 || cobrando}>
                {cobrando ? 'Cobrando...' : 'Cobrar'}
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
                <div className="cierre-row total">
                  <span>Total</span>
                  <strong>{formatMoney(totalGeneral)}</strong>
                </div>
              </div>
              {cierreError && <div className="form-message error">{cierreError}</div>}
              {cierreExito && <div className="form-message success">Caja cerrada correctamente</div>}
              <button
                className="primary-btn full cierre-btn"
                onClick={handleCierre}
                disabled={cantidad === 0 || cierreLoading}
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