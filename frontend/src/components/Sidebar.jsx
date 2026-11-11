import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export function Sidebar({ activePanel, setActivePanel }) {
  const { currentUser, logout } = useAuth();
  const { solicitudesPassword } = useApp();
  const isAdmin = currentUser?.role === 'Administrador';
  // En celular y tablet el menú se pliega detrás del botón ☰ (en la computadora siempre se ve).
  const [menuAbierto, setMenuAbierto] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'admin', label: 'Productos', adminOnly: true },
    { id: 'cajeros', label: 'Cajeros', adminOnly: true },
    { id: 'caja', label: 'Caja' },
    { id: 'reportes', label: 'Reportes' },
    { id: 'prediccion', label: 'Predicción', adminOnly: true },
    { id: 'clientes', label: 'Clientes' },
    { id: 'fiados', label: 'Fiados' },
  ];

  const filteredNav = navItems.filter(item => !item.adminOnly || isAdmin);
  const totalPendientes = solicitudesPassword.length;
  const pendientes = { cajeros: totalPendientes };
  const textoPendientes = (cantidad) =>
    `${cantidad} ${cantidad === 1 ? 'pedido de contraseña pendiente' : 'pedidos de contraseña pendientes'}`;

  const irA = (id) => {
    setActivePanel(id);
    setMenuAbierto(false);
  };

  return (
    <aside className={`sidebar ${menuAbierto ? 'menu-abierto' : ''}`}>
      <div className="sidebar-top">
        <div className="brand-mini">
          <div className="logo">WK</div>
          <div>
            <strong>Web Kiosko</strong>
            <small id="roleLabel">{currentUser?.role}</small>
          </div>
        </div>
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuAbierto
            ? 'Cerrar menú'
            : `Abrir menú${totalPendientes > 0 ? ` (${textoPendientes(totalPendientes)})` : ''}`}
          aria-expanded={menuAbierto}
          aria-controls="menuPrincipal"
          onClick={() => setMenuAbierto(abierto => !abierto)}
        >
          {menuAbierto ? '✕' : '☰'}
          {!menuAbierto && totalPendientes > 0 && (
            <span className="nav-count menu-toggle-count" aria-hidden="true">{totalPendientes}</span>
          )}
        </button>
      </div>

      <nav id="menuPrincipal" className="nav">
        {filteredNav.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${activePanel === item.id ? 'active' : ''}`}
            onClick={() => irA(item.id)}
          >
            {item.label}
            {pendientes[item.id] > 0 && (
              <>
                <span className="nav-count" aria-hidden="true" title={textoPendientes(pendientes[item.id])}>
                  {pendientes[item.id]}
                </span>
                <span className="visually-hidden">{` (${textoPendientes(pendientes[item.id])})`}</span>
              </>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span id="userBadge">{currentUser?.role}</span>
        <button className="secondary-btn" onClick={logout}>Cerrar sesión</button>
      </div>
    </aside>
  );
}
