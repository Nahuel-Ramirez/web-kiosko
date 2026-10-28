import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getStockStatus, getStockBadgeClass } from '../utils/stock';

export function Admin() {
  const {
    products,
    productsLoading,
    productsError,
    loadProducts,
    addProduct,
    updateStock,
    deleteProduct,
    updateProduct,
    formatMoney
  } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    cost: '',
    price: '',
    stock: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  // Id del producto con una operación en curso (stock o baja), para deshabilitar sus botones.
  const [busyId, setBusyId] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      code: product.code,
      cost: product.cost,
      price: product.price,
      stock: product.stock
    });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', code: '', cost: '', price: '', stock: '' });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { name, code, cost, price, stock } = formData;
    if (!name.trim() || !code.trim() || !cost || !price || !stock) {
      setError('Complete todos los campos obligatorios.');
      return;
    }

    const codeExists = products.some(item => item.code === code.trim() && item.id !== editingId);
    if (codeExists) {
      setError('Ya existe un producto con ese código de barras.');
      return;
    }

    const productData = {
      name: name.trim(),
      code: code.trim(),
      cost: Number(cost),
      price: Number(price),
      stock: Number(stock)
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateProduct(editingId, productData);
        setSuccess('Producto actualizado correctamente.');
      } else {
        await addProduct(productData);
        setSuccess('Producto agregado correctamente.');
      }
      setEditingId(null);
      setFormData({ name: '', code: '', cost: '', price: '', stock: '' });
    } catch (err) {
      setError(err.message || 'No se pudo guardar el producto.');
    } finally {
      setSaving(false);
    }
  };

  const handleStockChange = async (product, change) => {
    setError('');
    setSuccess('');
    setBusyId(product.id);
    try {
      await updateStock(product.id, change);
    } catch (err) {
      setError(err.message || 'No se pudo ajustar el stock.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Eliminar "${product.name}"?`)) return;
    setError('');
    setSuccess('');
    setBusyId(product.id);
    try {
      await deleteProduct(product.id);
      if (editingId === product.id) handleCancelEdit();
      setSuccess(`Producto "${product.name}" eliminado.`);
    } catch (err) {
      // Si el producto tiene ventas el backend responde 409 con el motivo.
      setError(err.message || 'No se pudo eliminar el producto.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section id="adminPanel" className="panel active-panel">
      <div className="content-grid two-columns admin-grid">
        <div className="card">
          <div className="card-header">
            <h3>{editingId ? 'Editar producto' : 'Agregar producto'}</h3>
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
                disabled={editingId}
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
              <label htmlFor="prodStock">Stock <span className="required">*</span></label>
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

            <div className="form-actions">
              <button type="submit" className="primary-btn full" disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar producto'}
              </button>
              {editingId && (
                <button type="button" className="secondary-btn full" onClick={handleCancelEdit} disabled={saving}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Inventario</h3>
            <span className="badge">{products.length} productos</span>
          </div>
          {productsError && (
            <div className="form-message error">
              {productsError}{' '}
              <button type="button" className="mini-btn" onClick={loadProducts}>Reintentar</button>
            </div>
          )}
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
                          onClick={() => handleStockChange(product, -1)}
                          disabled={product.stock <= 0 || busyId === product.id}
                          aria-label="Quitar stock"
                        >−</button>
                        <span className="stock-value">{product.stock}</span>
                        <button
                          className="mini-btn"
                          onClick={() => handleStockChange(product, 1)}
                          disabled={busyId === product.id}
                          aria-label="Agregar stock"
                        >+</button>
                      </div>
                    </td>
                    <td>
                      <span className={getStockBadgeClass(product.stock)}>
                        {getStockStatus(product.stock).label}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="mini-btn edit-btn"
                          onClick={() => handleEdit(product)}
                          aria-label={`Editar ${product.name}`}
                        >
                          Editar
                        </button>
                        <button
                          className="mini-btn danger"
                          onClick={() => handleDelete(product)}
                          disabled={busyId === product.id}
                          aria-label={`Eliminar ${product.name}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {productsLoading && products.length === 0 && (
                  <tr>
                    <td colSpan="7" className="empty-row">
                      <div className="empty-state">
                        <span>Cargando productos...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!productsLoading && !productsError && products.length === 0 && (
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