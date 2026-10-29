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
import {
  registrarVenta,
  obtenerTurnoActual,
  crearCierre as crearCierreRequest
} from '../services/turnoService';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
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
    // Limpia datos viejos de la versión que guardaba productos y ventas en localStorage.
    localStorage.removeItem('kiosko_products');
    localStorage.removeItem('kiosko_sales');
    if (currentUser) {
      loadProducts();
    } else {
      setProducts([]);
      setProductsError('');
    }
  }, [currentUser, loadProducts]);


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

  // Arma el payload de POST /api/turnos/ventas. El backend exige total == suma(subtotal),
  // así que el descuento se reparte entre las líneas en centavos y el resto de redondeo
  // va a la línea más grande. Los importes van como string con 2 decimales (Decimal exacto).
  const buildVentaPayload = useCallback((clienteId) => {
    const aCentavos = (valor) => Math.round(Number(valor) * 100);
    const aPesos = (centavos) => (centavos / 100).toFixed(2);

    const lineas = cart.map(item => ({ item, centavos: aCentavos(item.price) * item.quantity }));
    const subtotalC = lineas.reduce((sum, linea) => sum + linea.centavos, 0);
    const descuentoC = aCentavos(getCartDiscount());

    let repartido = 0;
    const descuentos = lineas.map(linea => {
      const parte = subtotalC > 0 ? Math.floor((linea.centavos * descuentoC) / subtotalC) : 0;
      repartido += parte;
      return parte;
    });
    if (lineas.length) {
      const mayor = lineas.reduce((idx, linea, i) => (linea.centavos > lineas[idx].centavos ? i : idx), 0);
      descuentos[mayor] += descuentoC - repartido;
    }

    const totalC = subtotalC - descuentoC;
    const metodo = paymentMethod.toUpperCase();
    const esEfectivo = metodo === 'EFECTIVO';
    const recibidoC = esEfectivo ? aCentavos(cashReceived || 0) : totalC;

    return {
      cliente_id: clienteId || 1,
      total: aPesos(totalC),
      metodo_pago: metodo,
      monto_recibido: aPesos(recibidoC),
      vuelto: aPesos(Math.max(recibidoC - totalC, 0)),
      detalles: lineas.map((linea, i) => ({
        producto_id: linea.item.id,
        cantidad: linea.item.quantity,
        precio_unitario: aPesos(aCentavos(linea.item.price)),
        subtotal: aPesos(linea.centavos - descuentos[i])
      }))
    };
  }, [cart, cashReceived, paymentMethod, getCartDiscount]);

  // Registra la venta en el backend. Solo si responde 201 se vacía el carrito y se
  // recarga el stock desde la API. Si falla, lanza el Error con el motivo y el carrito queda igual.
  const handleCheckout = useCallback(async (clienteId) => {
    if (!cart.length) throw new Error('El carrito está vacío.');

    const payload = buildVentaPayload(clienteId);
    if (payload.metodo_pago === 'EFECTIVO' && Number(payload.monto_recibido) < Number(payload.total)) {
      throw new Error('El monto recibido no alcanza para cubrir el total.');
    }

    const venta = await registrarVenta(payload);

    setCart([]);
    setCashReceived('');
    setPaymentMethod('Efectivo');
    loadProducts();
    return venta;
  }, [cart, buildVentaPayload, loadProducts]);

  const cancelSale = useCallback(() => {
    setCart([]);
    setCashReceived('');
  }, []);

  const updateCashReceived = useCallback((value) => {
    setCashReceived(value);
  }, []);

  // Totales del turno abierto, calculados en el servidor.
  const getTotalesDelTurno = useCallback(async () => {
    const turno = await obtenerTurnoActual();
    return {
      totalEfectivo: Number(turno.total_efectivo),
      totalTarjeta: Number(turno.total_tarjeta),
      totalTransferencia: Number(turno.total_transferencia || 0),
      cantidad: turno.cantidad_ventas,
      totalGeneral: Number(turno.total_general)
    };
  }, []);

  // El servidor asocia las ventas abiertas al cierre y calcula los totales.
  const crearCierre = useCallback(async () => {
    const { cantidad } = await getTotalesDelTurno();
    if (cantidad === 0) {
      throw new Error('No hay ventas en este turno para cerrar');
    }
    return crearCierreRequest({
      observaciones: `Cierre automático - ${new Date().toLocaleString('es-AR')}`
    });
  }, [getTotalesDelTurno]);

  const value = {
    products,
    productsLoading,
    productsError,
    loadProducts,
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