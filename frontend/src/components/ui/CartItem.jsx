import { useApp } from '../../context/AppContext';

export function CartItem({ item, onUpdateQuantity, onRemove }) {
  const { formatMoney } = useApp();
  const itemTotal = item.price * item.quantity;

  return (
    <div className="cart-item">
      <div>
        <h4>{item.name}</h4>
        <small>{formatMoney(item.price)} c/u</small>
        <div className="qty-controls">
          <button
            className="qty-btn minus"
            onClick={() => onRemove(item.id)}
            aria-label="Eliminar"
            disabled={item.quantity <= 1}
          >
            🗑
          </button>
          <button
            className="qty-btn minus"
            onClick={() => onUpdateQuantity(item.id, -1)}
            aria-label="Disminuir"
            disabled={item.quantity <= 1}
          >
            −
          </button>
          <span className="qty-value">{item.quantity}</span>
          <button
            className="qty-btn plus"
            onClick={() => onUpdateQuantity(item.id, 1)}
            aria-label="Aumentar"
            disabled={item.quantity >= item.stock}
          >
            +
          </button>
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
      <div className="item-total">{formatMoney(itemTotal)}</div>
    </div>
  );
}