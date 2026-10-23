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

  const handlePrint = () => {
    // Crear ventana de impresión separada solo con el ticket
    const ticketHTML = document.querySelector('.ticket');
    if (!ticketHTML) return;
    
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    const styles = document.querySelector('style[data-vite-dev]')?.outerHTML || '';
    const ticketStyles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace; font-size: 12px; line-height: 1.5; color: #1f2937; background: white; padding: 10mm; }
        .ticket { width: 80mm; max-width: 100%; margin: 0 auto; background: white; }
        .ticket-header { text-align: center; margin-bottom: 5mm; }
        .ticket-title { font-size: 14px; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 2mm; }
        .ticket-subtitle { font-size: 10px; color: #6b7280; margin-bottom: 3mm; }
        .ticket-divider { font-size: 10px; letter-spacing: 0.05em; color: #6b7280; margin: 3mm 0; }
        .ticket-info { display: flex; flex-direction: column; gap: 2mm; font-size: 10px; text-align: left; margin-bottom: 3mm; }
        .ticket-info span { display: flex; justify-content: space-between; }
        .ticket-items { margin: 3mm 0; }
        .ticket-item { padding: 2mm 0; border-bottom: 1px dotted #d1d5db; }
        .ticket-item-name { font-size: 11px; }
        .ticket-totals { margin: 3mm 0; }
        .ticket-total-row { display: flex; justify-content: space-between; padding: 1mm 0; font-size: 11px; }
        .ticket-total-row.total { font-weight: 700; font-size: 13px; border-top: 1px solid #374151; padding-top: 3mm; margin-top: 2mm; }
        .ticket-total-row.discount { color: #dc2626; }
        .ticket-payment { margin: 3mm 0; font-size: 10px; }
        .ticket-payment .ticket-total-row { padding: 1mm 0; }
        .ticket-footer { text-align: center; margin-top: 5mm; font-size: 10px; color: #6b7280; }
        .ticket-small { font-size: 9px; opacity: 0.7; }
        .ticket-cut { text-align: center; margin-top: 5mm; font-size: 10px; color: #9ca3af; letter-spacing: 0.2em; }
        @media print { body { margin: 0; padding: 0; } .no-print { display: none !important; } }
      </style>
    `;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket - ${venta.id}</title>
          ${ticketStyles}
        </head>
        <body>
          ${ticketHTML.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
    printWindow.onafterprint = () => printWindow.close();
  };

  if (!isOpen || !venta) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-ticket" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Vista previa del ticket</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <TicketVenta venta={venta} onPrint={handlePrint} onClose={onClose} />
      </div>
    </div>
  );
}