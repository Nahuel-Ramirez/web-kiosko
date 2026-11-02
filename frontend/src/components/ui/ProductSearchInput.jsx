import { useMemo, useCallback, useEffect, useState } from 'react';

/**
 * Componente de búsqueda de productos unificado para Caja y Admin.
 * Filtra en tiempo real por nombre, código y categoría.
 * Diseño minimalista, dark-mode ready, accesible.
 */
export function ProductSearchInput({
  value = '',
  onChange,
  placeholder = 'Buscar por nombre, código o categoría...',
  debounceMs = 150,
  className = '',
  autoFocus = false,
  variant = 'dark', // 'dark' | 'light'
  'aria-label': ariaLabel = 'Buscar productos',
}) {
  const [internalValue, setInternalValue] = useState(value);

  // Sincronizar con valor externo (cuando viene del contexto)
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.target.value = '';
      setInternalValue('');
      onChange?.('');
      e.target.blur();
    }
  }, [onChange]);

  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange?.('');
    document.getElementById('product-search')?.focus();
  }, [onChange]);

  const wrapperClass = `product-search-wrapper ${variant === 'light' ? 'product-search-wrapper--light' : ''} ${className}`;
  const inputClass = `product-search-input ${variant === 'light' ? 'product-search-input--light' : ''}`;

  return (
    <div className={wrapperClass}>
      <label htmlFor="product-search" className="visually-hidden">
        {ariaLabel}
      </label>
      <div className="product-search-input-wrapper">
        <svg 
          className="search-icon" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          id="product-search"
          type="search"
          className={inputClass}
          value={internalValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          aria-label={ariaLabel}
        />
        {internalValue && (
          <button
            type="button"
            className="product-search-clear"
            onClick={handleClear}
            aria-label="Limpiar búsqueda"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook de filtrado reutilizable - misma lógica en Caja y Admin
 * @param {Array} products - Lista de productos
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Array} Productos filtrados
 */
export function useProductFilter(products, searchTerm) {
  return useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    if (!term) return products;
    
    return products.filter(product => 
      product.name.toLowerCase().includes(term) ||
      product.code.toLowerCase().includes(term) ||
      (product.category && product.category.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);
}