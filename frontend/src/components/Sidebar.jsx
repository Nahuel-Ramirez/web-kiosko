import { useAuth } from '../context/AuthContext';

export function Sidebar({ activePanel, setActivePanel }) {
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.role === 'Administrador';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'admin', label: 'Productos', adminOnly: true },
    { id: 'cajeros', label: 'Cajeros', adminOnly: true },
    { id: 'caja', label: 'Caja' },
    { id: 'reportes', label: 'Reportes' }
  ];

  const filteredNav = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="sidebar">
      <div className="brand-mini">
        <div className="logo">WK</div>
        <div>
          <strong>Web Kiosko</strong>
          <small id="roleLabel">{currentUser?.role}</small>
        </div>
      </div>

      <nav className="nav">
        {filteredNav.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${activePanel === item.id ? 'active' : ''}`}
            onClick={() => setActivePanel(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span id="userBadge">{currentUser?.role}</span>
        <button className="secondary-btn" onClick={logout}>Cerrar sesion</button>
      </div>
    </aside>
  );
}