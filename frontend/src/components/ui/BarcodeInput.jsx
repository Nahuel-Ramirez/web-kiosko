import { useRef, useCallback } from 'react';

export function BarcodeInput({ onScan, placeholder = 'Escanee código de barras...', autoFocus = true }) {
  const inputRef = useRef(null);

  const handleScan = useCallback(
    (code) => {
      onScan(code);
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
    <input
      ref={inputRef}
      data-barcode-input="true"
      type="text"
      placeholder={placeholder}
      onKeyDown={handleKeyDown}
      autoFocus={autoFocus}
      className="barcode-input"
    />
  );
}