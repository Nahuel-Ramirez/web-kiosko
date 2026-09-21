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
    cost: '',
    price: '',
    stock: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { name, code, cost, price, stock } = formData;
    if (!name.trim() || !code.trim() || !cost || !price || !stock) {
      setError('Complete todos los campos obligatorios.');
      return;
    }

    if (products.some(item => item.code === code.trim())) {
      setError('Ya existe un producto con ese código de barras.');
      return;
    }

    addProduct({
      name: name.trim(),
      code: code.trim(),
      cost: Number(cost),
      price: Number(price),
      stock: Number(stock)
    });

    setSuccess('Producto agregado correctamente.');
    setFormData({ name: '', code: '', cost: '', price: '', stock: '' });
  };

  return (
    <section id="adminPanel" className="panel active-panel">
      <div className="content-grid two-columns admin-grid">
        <div className="card">
          <div className="card-header">
            <h3>Agregar producto</h3>
          </div>
          <form id="productForm" className="product-form" onSubmit={handleSubmit}>
            {error && <div className="form-message error">{error}</div>}
            {success && <div className="form-message success">{success}</div>}

            <div className="form-field">
              <label htmlFor="prodName">Nombre del producto <span className="required">*</span></label>
              <input
                type="text"
                id="prodName"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: Coca Cola 600ml"
                required
                autoComplete="off"
              />
            </div>

            <div className="form-field">
              <label htmlFor="prodCode">Código de barras <span className="required">*</span></label>
              <input
                type="text"
                id="prodCode"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="Ej: 750123456789"
                required
                autoComplete="off"
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="prodCost">Precio de costo ($) <span className="required">*</span></label>
                <input
                  type="number"
                  id="prodCost"
                  name="cost"
                  min="0"
                  step="0.01"
                  value={formData.cost}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="prodPrice">Precio de venta ($) <span className="required">*</span></label>
                <input
                  type="number"
                  id="prodPrice"
                  name="price"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="prodStock">Stock inicial <span className="required">*</span></label>
              <input
                type="number"
                id="prodStock"
                name="stock"
                min="0"
                step="1"
                value={formData.stock}
                onChange={handleChange}
                placeholder="0"
                required
              />
            </div>

            <button type="submit" className="primary-btn full">Guardar producto</button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Inventario</h3>
            <span className="badge">{products.length} productos</span>
          </div>
          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Código</th>
                  <th>Costo</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} className={product.stock <= 5 ? 'low-stock' : ''}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td><code>{product.code}</code></td>
                    <td>{formatMoney(product.cost)}</td>
                    <td><strong>{formatMoney(product.price)}</strong></td>
                    <td>
                      <div className="stock-controls">
                        <button
                          className="mini-btn"
                          onClick={() => updateStock(product.id, -1)}
                          disabled={product.stock <= 0}
                          aria-label="Quitar stock"
                        >−</button>
                        <span className="stock-value">{product.stock}</span>
                        <button
                          className="mini-btn"
                          onClick={() => updateStock(product.id, 1)}
                          aria-label="Agregar stock"
                        >+</button>
                      </div>
                    </td>
                    <td>
                      <span className={`stock-badge ${product.stock <= 0 ? 'empty' : product.stock <= 5 ? 'low' : 'ok'}`}>
                        {product.stock <= 0 ? 'Sin stock' : product.stock <= 5 ? 'Stock bajo' : 'OK'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="mini-btn danger"
                        onClick={() => {
                          if (window.confirm(`Eliminar "${product.name}"?`)) {
                            deleteProduct(product.id);
                          }
                        }}
                        aria-label={`Eliminar ${product.name}`}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan="7" className="empty-row">
                      <div className="empty-state">
                        <span>No hay productos cargados</span>
                        <small>Use el formulario de la izquierda para agregar el primero</small>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}