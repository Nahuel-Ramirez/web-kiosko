import { useState, Fragment, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getStockStatus, getStockTagClass } from '../utils/stock';
import { TicketVentaModal } from './TicketVenta';
import { BarcodeInput } from './ui/BarcodeInput';
import { ClienteSelectorModal } from './ui/ClienteSelectorModal';

export function Caja() {
  const {
    products,
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

  const cargarTotalesTurno = async () => {
    try {
      const totales = await getTotalesDelTurno();
      setTurnoTotales(totales);
    } catch (err) {
      console.error('Error cargando totales del turno:', err);
    }
  };

  const handleBarcodeScan = (code) => {
    const product = products.find(p => p.code === code);
    if (product && product.stock > 0) {
      addToCart(product.id);
    } else if (product && product.stock <= 0) {
      alert('Producto sin stock');
    } else {
      alert('Producto no encontrado');
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
    if (!window.confirm(`¿Cerrar caja?\nEfectivo: ${formatMoney(totalEfectivo)}\nTarjeta/Transferencia: ${formatMoney(totalTarjeta + totalTransferencia)}\nVentas: ${cantidad}\nTotal: ${formatMoney(totalGeneral)}`)) {
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

  const handleCheckoutWithTicket = () => {
    const subtotal = getCartSubtotal();
    const discount = getCartDiscount();
    const total = subtotal - discount;
    if (!cart.length) return;

    const received = Number(cashReceived || 0);
    const change = Math.max(received - total, 0);

    const now = new Date();
    const saleData = {
      id: Date.now(),
      items: cart.map(item => item.name).join(', '),
      total,
      method: paymentMethod,
      fecha: now.toISOString(),
      time: now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      cajero: 'Cajero',
      cliente: clienteSeleccionado?.nombre || 'Consumidor Final',
      metodo_pago: paymentMethod,
      monto_recibido: received,
      vuelto: change,
      subtotal,
      descuento: discount,
      cliente_id: clienteSeleccionado?.id || 1,
    };

    handleCheckout();
    setLastSale(saleData);
    setShowTicket(true);
    cargarTotalesTurno();
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
                  placeholder="Escanee código de barras o busque producto..."
                  autoFocus
                />
              </div>
            </div>
            <div id="catalogGrid" className="catalog-grid">
              {filteredProducts.length === 0 ? (
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
                            onUpdateQuantity(item.id, val - item.quantity);
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
                  value={cashReceived}
                  onChange={(e) => updateCashReceived(e.target.value)}
                />
              </label>
              <div className="change-box">
                <span>Vuelto</span>
                <strong>{formatMoney(change)}</strong>
              </div>
            </div>

            <div className="cart-actions">
              <button id="cancelSaleBtn" className="secondary-btn full" onClick={cancelSale}>Cancelar</button>
              <button id="checkoutBtn" className="primary-btn full" onClick={handleCheckoutWithTicket} disabled={cart.length === 0}>Cobrar</button>
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
                  <span>Tarjeta / Transferencia</span>
                  <strong>{formatMoney(totalTarjeta + totalTransferencia)}</strong>
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