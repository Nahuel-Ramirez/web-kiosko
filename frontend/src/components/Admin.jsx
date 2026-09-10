import { useState } from 'react';
import { useApp } from '../context/AppContext';

export function Admin() {
  const {
    products,
    addProduct,
    updateStock,
    deleteProduct,
    formatMoney
  } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    cost: '',
    price: '',
    stock: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const { name, code, category, cost, price, stock } = formData;
    if (!name.trim() || !code.trim() || !category.trim() || !cost || !price || !stock) {
      setError('Complete todos los campos.');
      return;
    }

    if (products.some(item => item.code === code.trim())) {
      setError('Ya existe un producto con ese codigo.');
      return;
    }

    addProduct({
      name: name.trim(),
      code: code.trim(),
      category: category.trim(),
      cost: Number(cost),
      price: Number(price),
      stock: Number(stock)
    });

    setFormData({ name: '', code: '', category: '', cost: '', price: '', stock: '' });
  };

  return (
    <section id="adminPanel" className="panel active-panel">
      <div className="content-grid two-columns admin-grid">
        <div className="card">
          <div className="card-header">
            <h3>Agregar producto</h3>
          </div>
          <form id="productForm" className="product-form" onSubmit={handleSubmit}>
            {error && <div className="empty-state" style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}>{error}</div>}
            
            <div className="field-row">
              <label htmlFor="prodName">
                Nombre
                <input
                  type="text"
                  id="prodName"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            <div className="field-row two-fields">
              <label htmlFor="prodCode">
                Codigo
                <input
                  type="text"
                  id="prodCode"
                  value={formData.code}
                  onChange={handleChange}
                  required
                />
              </label>
              <label htmlFor="prodCategory">
                Categoria
                <input
                  type="text"
                  id="prodCategory"
                  value={formData.category}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            <div className="field-row two-fields">
              <label htmlFor="prodCost">
                Costo
                <input
                  type="number"
                  id="prodCost"
                  min="0"
                  step="0.01"
                  value={formData.cost}
                  onChange={handleChange}
                  required
                />
              </label>
              <label htmlFor="prodPrice">
                Precio
                <input
                  type="number"
                  id="prodPrice"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            <div className="field-row two-fields">
              <label htmlFor="prodStock">
                Stock
                <input
                  type="number"
                  id="prodStock"
                  min="0"
                  step="1"
                  value={formData.stock}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            <button type="submit" className="primary-btn full">Guardar producto</button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Inventario</h3>
          </div>
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody id="inventoryTable">
              {products.map(product => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong><br />
                    <small>{product.code}</small>
                  </td>
                  <td>
                    <div className="stock-controls">
                      <button
                        className="mini-btn"
                        onClick={() => updateStock(product.id, -1)}
                        disabled={product.stock <= 0}
                      >-</button>
                      <span className="stock-value">{product.stock}</span>
                      <button
                        className="mini-btn"
                        onClick={() => updateStock(product.id, 1)}
                      >+</button>
                    </div>
                  </td>
                  <td>{formatMoney(product.price)}</td>
                  <td>
                    <button
                      className="mini-btn danger"
                      onClick={() => {
                        if (window.confirm('Eliminar este producto?')) {
                          deleteProduct(product.id);
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                    <span className="empty-state" style={{ display: 'block' }}>No hay productos</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}