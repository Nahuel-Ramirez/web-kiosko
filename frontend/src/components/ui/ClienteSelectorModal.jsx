import { useState } from 'react';
import { ClientSearchInput } from './ClientSearchInput';

export function ClienteSelectorModal({ isOpen, onClose, onSelect, initialClient = null }) {
  if (!isOpen) return null;

  const handleSelect = (client) => {
    onSelect(client);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-client-selector" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Asignar Cliente</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-body">
          <p className="modal-hint">
            Seleccione un cliente para asociar a esta venta. 
            <strong>Consumidor Final</strong> se asigna por defecto.
          </p>
          
          <div className="client-options">
            <button
              type="button"
              className="client-option-btn consumidor-final"
              onClick={() => {
                handleSelect({ id: 1, nombre: 'Consumidor Final', dni: '0', cuit: '0' });
              }}
            >
              <span className="option-icon">👤</span>
              <div>
                <strong>Consumidor Final</strong>
                <small>Cliente genérico sin identificación</small>
              </div>
            </button>

            <div className="divider">o buscar cliente registrado</div>

            <ClientSearchInput
              initialClient={initialClient}
              onSelect={(client) => {
                if (client) handleSelect(client);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}