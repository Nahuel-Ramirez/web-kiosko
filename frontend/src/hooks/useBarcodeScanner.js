import { useState, useEffect, useCallback, useRef } from 'react';

export function useBarcodeScanner(onScan, { delay = 100 } = {}) {
  const [buffer, setBuffer] = useState('');
  const [lastScanTime, setLastScanTime] = useState(0);
  const timeoutRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      const now = Date.now();
      
      // Ignorar teclas modificadoras
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      // Enter = fin del escaneo
      if (e.key === 'Enter') {
        e.preventDefault();
        const code = buffer.trim();
        if (code.length >= 8) { // Códigos de barras típicos tienen 8+ dígitos
          onScan(code);
        }
        setBuffer('');
        setLastScanTime(now);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
      }

      // Caracteres imprimibles
      if (e.key.length === 1) {
        setBuffer((prev) => prev + e.key);
        setLastScanTime(now);
        
        // Timeout para limpiar buffer si deja de escanear
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setBuffer('');
        }, delay);
      }
    },
    [buffer, onScan, delay]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleKeyDown]);

  // Exponer método para limpiar manualmente
  const clear = useCallback(() => {
    setBuffer('');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { buffer, clear };
}