import { useState, useRef, useCallback } from 'react';

// onChange (opcional) recibe el texto mientras se escribe, para filtrar el catálogo.
export function BarcodeInput({ onScan, onChange, placeholder = 'Escanee código de barras...', autoFocus = true }) {
  const [showScanner, setShowScanner] = useState(true);
  const inputRef = useRef(null);

  const handleScan = useCallback(
    (code) => {
      onScan(code);
      setTimeout(() => setShowScanner(true), 1500);
    },
    [onScan]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const code = e.target.value.trim();
      if (code) {
        onScan(code);
        e.target.value = '';
        if (onChange) onChange('');
        e.target.style.borderColor = '#10b981';
        setTimeout(() => {
          e.target.style.borderColor = '';
        }, 1500);
      }
    }
  };

  return (
    <div className="barcode-input-wrapper">
      <input
        ref={inputRef}
        data-barcode-input="true"
        type="text"
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        autoFocus={autoFocus}
        className="barcode-input"
        style={{
          width: '100%',
          padding: '0.85rem 1rem',
          border: '2px solid var(--line)',
          borderRadius: '10px',
          fontSize: '1.1rem',
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      />
      <div className="scanner-hint">
        <kbd>Enter</kbd> para confirmar escaneo
      </div>
    </div>
  );
}