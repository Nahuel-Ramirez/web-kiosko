import { useApp } from '../context/AppContext';

const TICKET_WIDTHS = {
  '58mm': '58mm',
  '80mm': '80mm',
};

export function TicketVenta({ venta, width = '80mm', onPrint, onClose }) {
  const { formatMoney } = useApp();

  const formatFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const items = venta.items ? venta.items.split(', ').map(item => item.trim()) : [];

  return (
    <div className={`ticket-container ticket-${width.replace('mm', '')}`}>
      <div className="ticket" ref={el => window.ticketRef = el}>
        <div className="ticket-header">
          <div className="ticket-title">WEB KIOSKO</div>
          <div className="ticket-subtitle">Kiosco / Minimarket</div>
          <div className="ticket-divider">------------------------------</div>
          <div className="ticket-info">
            <span>Ticket N°: <strong>{venta.id}</strong></span>
            <span>Fecha: <strong>{formatFecha(venta.fecha)}</strong></span>
            <span>Cajero: <strong>{venta.cajero || 'Admin'}</strong></span>
            <span>Cliente: <strong>{venta.cliente || 'Consumidor Final'}</strong></span>
          </div>
          <div className="ticket-divider">------------------------------</div>
        </div>

        <div className="ticket-items">
          {items.map((item, idx) => (
            <div key={idx} className="ticket-item">
              <div className="ticket-item-name">{item}</div>
            </div>
          ))}
        </div>

        <div className="ticket-divider">------------------------------</div>

        <div className="ticket-totals">
          <div className="ticket-total-row">
            <span>Subtotal:</span>
            <strong>{formatMoney(venta.subtotal || venta.total)}</strong>
          </div>
          {venta.descuento > 0 && (
            <div className="ticket-total-row discount">
              <span>Descuento:</span>
              <strong>-{formatMoney(venta.descuento)}</strong>
            </div>
          )}
          <div className="ticket-total-row total">
            <span>TOTAL:</span>
            <strong>{formatMoney(venta.total)}</strong>
          </div>
        </div>

        <div className="ticket-divider">==============================</div>

        <div className="ticket-payment">
          <div className="ticket-total-row">
            <span>Método:</span>
            <strong>{venta.metodo_pago || venta.method}</strong>
          </div>
          {venta.monto_recibido && (
            <>
              <div className="ticket-total-row">
                <span>Recibido:</span>
                <strong>{formatMoney(venta.monto_recibido)}</strong>
              </div>
              <div className="ticket-total-row">
                <span>Vuelto:</span>
                <strong>{formatMoney(venta.vuelto || 0)}</strong>
              </div>
            </>
          )}
        </div>

        <div className="ticket-divider">==============================</div>

        <div className="ticket-footer">
          <div>¡Gracias por su compra!</div>
          <div className="ticket-small">Web Kiosko - Sistema POS</div>
          <div className="ticket-small">www.webkiosko.com</div>
        </div>

        <div className="ticket-cut">✂ ✂ ✂ ✂ ✂ ✂ ✂ ✂ ✂ ✂</div>
      </div>

      <div className="ticket-actions">
        <button className="secondary-btn" onClick={onClose}>Cerrar</button>
        <button className="primary-btn" onClick={onPrint}>
          🖨 Imprimir / Guardar PDF
        </button>
      </div>
    </div>
  );
}

export function TicketVentaModal({ venta, isOpen, onClose, onPrint }) {
  if (!isOpen || !venta) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-ticket" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Vista previa del ticket</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <TicketVenta venta={venta} onPrint={onPrint} onClose={onClose} />
      </div>
    </div>
  );
}