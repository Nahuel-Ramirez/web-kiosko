import { useState } from 'react';
import { useApp } from '../context/AppContext';

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
    getVentasDelTurno,
    getTotalesDelTurno,
    crearCierre
  } = useApp();

  const [cierreLoading, setCierreLoading] = useState(false);
  const [cierreError, setCierreError] = useState('');
  const [cierreExito, setCierreExito] = useState(false);

  const filteredProducts = products.filter(product => {
    const term = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(term) ||
      product.code.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term)
    );
  });

  const subtotal = getCartSubtotal();
  const discount = getCartDiscount();
  const total = subtotal - discount;
  const received = Number(cashReceived || 0);
  const change = Math.max(received - total, 0);

  const { totalEfectivo, totalTarjeta, totalTransferencia, cantidad, totalGeneral } = getTotalesDelTurno();

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
    }
  };

  return (
    <section id="cajaPanel" className="panel active-panel">
      <div className="content-grid two-columns checkout-grid">
        <div className="card checkout-panel">
          <div className="card-header">
            <h3>Punto de venta</h3>
            <div className="search-box">
              <input
                id="productSearch"
                type="text"
                placeholder="Buscar producto o codigo"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                      <span>{product.category}</span>
                      <span>{product.stock} uds.</span>
                    </div>
                  </div>
                  <div className="price">{formatMoney(product.price)}</div>
                  <div className="action-row">
                    <span className={`tag ${product.stock < 5 ? 'warning' : 'success'}`}>
                      {product.stock < 5 ? 'Stock bajo' : 'Disponible'}
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
                        data-qty="minus"
                        data-id={item.id}
                        onClick={() => updateCartQuantity(item.id, -1)}
                      >-</button>
                      <span>{item.quantity}</span>
                      <button
                        data-qty="plus"
                        data-id={item.id}
                        onClick={() => updateCartQuantity(item.id, 1)}
                      >+</button>
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
            <button id="checkoutBtn" className="primary-btn full" onClick={handleCheckout} disabled={cart.length === 0}>Cobrar</button>
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
  );
}