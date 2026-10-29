import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  listarProductos,
  crearProducto,
  actualizarProducto,
  agregarStock,
  setearStock,
  eliminarProducto
} from '../services/productosService';

const AppContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('web_kiosko_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const initialSales = [
  { id: 1001, items: 'Coca Cola + Agua', total: 1650, method: 'Efectivo', time: 'Hace 20 min' },
  { id: 1002, items: 'Milanesa + Snacks', total: 2240, method: 'Tarjeta', time: 'Hace 1 h' },
  { id: 1003, items: 'Galletas + Café', total: 980, method: 'Efectivo', time: 'Hace 2 h' }
];

export function AppProvider({ children }) {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [sales, setSales] = useState(() => {
    const saved = localStorage.getItem('kiosko_sales');
    return saved ? JSON.parse(saved) : initialSales;
  });
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [activePanel, setActivePanel] = useState('dashboard');

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError('');
    try {
      setProducts(await listarProductos());
    } catch (err) {
      setProductsError(err.message || 'No se pudieron cargar los productos.');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Los productos salen de la API: se cargan al iniciar sesión y se vacían al salir.
  useEffect(() => {
    // Limpia datos viejos de la versión que guardaba productos en localStorage.
    localStorage.removeItem('kiosko_products');
    if (currentUser) {
      loadProducts();
    } else {
      setProducts([]);
      setProductsError('');
    }
  }, [currentUser, loadProducts]);

  useEffect(() => {
    localStorage.setItem('kiosko_sales', JSON.stringify(sales));
  }, [sales]);

  const formatMoney = useCallback((value) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(value);
  }, []);

  const getLowStockProducts = useCallback(() => {
    return products
      .filter((product) => product.stock <= 100)
      .sort((a, b) => a.stock - b.stock);
  }, [products]);

  const getTotalProductsValue = useCallback(() => {
    return products.reduce((sum, product) => sum + product.stock * product.price, 0);
  }, [products]);

  const getSalesTotal = useCallback(() => {
    return sales.reduce((sum, sale) => sum + sale.total, 0);
  }, [sales]);

  const getTopProducts = useCallback(() => {
    const ranking = products.map((product) => ({
      name: product.name,
      sold: Math.max(1, Math.round((product.stock * 0.5) + product.price / 100)),
      qty: Math.max(1, 20 - product.stock)
    }));

    return ranking
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 4);
  }, [products]);

  // Las operaciones de productos persisten en la API y actualizan el estado con la respuesta.
  // Si el backend rechaza la operación, el Error lleva su mensaje (detail) para mostrarlo.
  const replaceProduct = useCallback((updated) => {
    setProducts(prev => prev.map(product => (product.id === updated.id ? updated : product)));
  }, []);

  const addProduct = useCallback(async (productData) => {
    const created = await crearProducto(productData);
    setProducts(prev => [...prev, created]);
    return created;
  }, []);

  const updateStock = useCallback(async (productId, change) => {
    const product = products.find(item => item.id === productId);
    if (!product) return null;
    const updated = change > 0
      ? await agregarStock(productId, change)
      : await setearStock(productId, Math.max(0, product.stock + change));
    replaceProduct(updated);
    return updated;
  }, [products, replaceProduct]);

  const deleteProduct = useCallback(async (productId) => {
    await eliminarProducto(productId);
    setProducts(prev => prev.filter(product => product.id !== productId));
  }, []);

  const updateProduct = useCallback(async (productId, productData) => {
    const updated = await actualizarProducto(productId, productData);
    replaceProduct(updated);
    return updated;
  }, [replaceProduct]);

  const addToCart = useCallback((productId) => {
    const product = products.find(item => item.id === productId);
    if (!product || product.stock <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => 
          item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prev, { ...product, quantity: 1 }];
      }
    });
  }, [products]);

  const updateCartQuantity = useCallback((productId, change) => {
    setCart(prev => {
      const item = prev.find(entry => entry.id === productId);
      if (!item) return prev;

      const newQuantity = item.quantity + change;
      if (newQuantity <= 0) {
        return prev.filter(entry => entry.id !== productId);
      }
      return prev.map(entry => 
        entry.id === productId ? { ...entry, quantity: newQuantity } : entry
      );
    });
  }, []);

  const getCartSubtotal = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const getCartDiscount = useCallback(() => {
    return cart.length > 0 ? Math.round(getCartSubtotal() * 0.05) : 0;
  }, [cart, getCartSubtotal]);

  const handleCheckout = useCallback(() => {
    const subtotal = getCartSubtotal();
    const discount = getCartDiscount();
    const total = subtotal - discount;
    if (!cart.length) return;

    const received = Number(cashReceived || 0);
    const change = Math.max(received - total, 0);

    const now = new Date();
    const sale = {
      id: Date.now(),
      items: cart.map(item => item.name).join(', '),
      total,
      method: paymentMethod,
      fecha: now.toISOString(),
      time: now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    };

    setSales(prev => [sale, ...prev]);

    setProducts(prev => prev.map(product => {
      const cartItem = cart.find(item => item.id === product.id);
      if (cartItem) {
        return { ...product, stock: Math.max(0, product.stock - cartItem.quantity) };
      }
      return product;
    }));

    setCart([]);
    setCashReceived('');
    setPaymentMethod('Efectivo');
  }, [cart, cashReceived, paymentMethod, getCartSubtotal, getCartDiscount]);

  const cancelSale = useCallback(() => {
    setCart([]);
    setCashReceived('');
  }, []);

  const updateCashReceived = useCallback((value) => {
    setCashReceived(value);
  }, []);

  const getVentasDelTurno = useCallback(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.fecha || sale.time);
      return saleDate >= hoy && saleDate < manana;
    });
  }, [sales]);

  const getTotalesDelTurno = useCallback(() => {
    const ventas = getVentasDelTurno();
    const totalEfectivo = ventas
      .filter(v => v.method === 'Efectivo')
      .reduce((sum, v) => sum + v.total, 0);
    const totalTarjeta = ventas
      .filter(v => v.method === 'Tarjeta')
      .reduce((sum, v) => sum + v.total, 0);
    const totalTransferencia = ventas
      .filter(v => v.method === 'Transferencia')
      .reduce((sum, v) => sum + v.total, 0);
    const cantidad = ventas.length;
    const totalGeneral = totalEfectivo + totalTarjeta + totalTransferencia;
    
    return { totalEfectivo, totalTarjeta, totalTransferencia, cantidad, totalGeneral, ventas };
  }, [getVentasDelTurno]);

  const crearCierre = useCallback(async () => {
    const { totalEfectivo, totalTarjeta, totalTransferencia, cantidad } = getTotalesDelTurno();
    
    if (cantidad === 0) {
      throw new Error('No hay ventas en este turno para cerrar');
    }

    const response = await fetch(`${API_URL}/api/turnos/cierre`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        total_efectivo: totalEfectivo,
        total_tarjeta: totalTarjeta + totalTransferencia,
        cantidad_ventas: cantidad,
        observaciones: `Cierre automático - ${new Date().toLocaleString('es-AR')}`
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al cerrar caja');
    }

    return response.json();
  }, [getTotalesDelTurno]);

  const value = {
    products,
    productsLoading,
    productsError,
    loadProducts,
    sales,
    cart,
    searchTerm,
    setSearchTerm,
    cashReceived,
    paymentMethod,
    setPaymentMethod,
    activePanel,
    setActivePanel,
    formatMoney,
    getLowStockProducts,
    getTotalProductsValue,
    getSalesTotal,
    getTopProducts,
    addProduct,
    updateStock,
    deleteProduct,
    updateProduct,
    addToCart,
    updateCartQuantity,
    getCartSubtotal,
    getCartDiscount,
    handleCheckout,
    cancelSale,
    updateCashReceived,
    getVentasDelTurno,
    getTotalesDelTurno,
    crearCierre
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}