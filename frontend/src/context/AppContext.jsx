import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

const initialProducts = [
  { id: 1, code: '750123', name: 'Coca Cola 600ml', category: 'Bebidas', cost: 650, price: 950, stock: 16 },
  { id: 2, code: '750456', name: 'Agua Mineral 500ml', category: 'Bebidas', cost: 350, price: 700, stock: 9 },
  { id: 3, code: '779001', name: 'Chocolate Block', category: 'Alimentos', cost: 480, price: 890, stock: 7 },
  { id: 4, code: '779456', name: 'Galletas Saladas', category: 'Alimentos', cost: 420, price: 760, stock: 12 },
  { id: 5, code: '779999', name: 'Café Molido', category: 'Bebidas', cost: 520, price: 980, stock: 5 },
  { id: 6, code: '789012', name: 'Papel Higiénico', category: 'Hogar', cost: 740, price: 1290, stock: 4 },
  { id: 7, code: '789333', name: 'Snacks Mix', category: 'Snacks', cost: 510, price: 900, stock: 8 },
  { id: 8, code: '789777', name: 'Jugo de Naranja', category: 'Bebidas', cost: 420, price: 820, stock: 3 }
];

const initialSales = [
  { id: 1001, items: 'Coca Cola + Agua', total: 1650, method: 'Efectivo', time: 'Hace 20 min' },
  { id: 1002, items: 'Milanesa + Snacks', total: 2240, method: 'Tarjeta', time: 'Hace 1 h' },
  { id: 1003, items: 'Galletas + Café', total: 980, method: 'Efectivo', time: 'Hace 2 h' }
];

export function AppProvider({ children }) {
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('kiosko_products');
    return saved ? JSON.parse(saved) : initialProducts;
  });
  const [sales, setSales] = useState(() => {
    const saved = localStorage.getItem('kiosko_sales');
    return saved ? JSON.parse(saved) : initialSales;
  });
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [activePanel, setActivePanel] = useState('dashboard');

  useEffect(() => {
    localStorage.setItem('kiosko_products', JSON.stringify(products));
  }, [products]);

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
    return products.filter((product) => product.stock < 5);
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

  const addProduct = useCallback((productData) => {
    const newProduct = {
      id: Date.now(),
      ...productData,
      stock: Number(productData.stock),
      price: Number(productData.price),
      cost: Number(productData.cost)
    };
    setProducts(prev => [...prev, newProduct]);
  }, []);

  const updateStock = useCallback((productId, change) => {
    setProducts(prev => prev.map(product => {
      if (product.id === productId) {
        const newStock = Math.max(0, product.stock + change);
        return { ...product, stock: newStock };
      }
      return product;
    }));
  }, []);

  const deleteProduct = useCallback((productId) => {
    setProducts(prev => prev.filter(product => product.id !== productId));
  }, []);

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

    const sale = {
      id: Date.now(),
      items: cart.map(item => item.name).join(', '),
      total,
      method: paymentMethod,
      time: 'Ahora'
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

  const value = {
    products,
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
    addToCart,
    updateCartQuantity,
    getCartSubtotal,
    getCartDiscount,
    handleCheckout,
    cancelSale,
    updateCashReceived
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