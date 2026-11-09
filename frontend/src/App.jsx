import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Login } from './components/Login';
import { LoginVisual } from './components/LoginVisual';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Admin } from './components/Admin';
import { Cajeros } from './components/Cajeros';
import { Caja } from './components/Caja';
import { Reportes } from './components/Reportes';
import { PrediccionDemanda } from './components/PrediccionDemanda';
import { getStockStatus, getStockTagClass } from './utils/stock';

// En true muestra LoginVisual (mockup sin backend). En false usa el login
// real, conectado a la API (ver src/services/authService.js).
const DEMO_MODE = false;

function AppContent() {
  const { currentUser, loading } = useAuth();
  const { activePanel, setActivePanel, getLowStockProducts } = useApp();
  const [alertasOpen, setAlertasOpen] = useState(false);
  const lowStockProducts = getLowStockProducts();

  if (loading) {
    return null;
  }

  if (!currentUser) {
    return DEMO_MODE ? <LoginVisual /> : <Login />;
  }

  const isAdmin = currentUser.role === 'Administrador';

  const renderPanel = () => {
    switch (activePanel) {
      case 'dashboard':
        return <Dashboard />;
      case 'admin':
        return isAdmin ? <Admin /> : <Caja />;
      case 'cajeros':
        return isAdmin ? <Cajeros /> : <Caja />;
      case 'caja':
        return <Caja />;
      case 'reportes':
        return <Reportes />;
      case 'prediccion':
        return isAdmin ? <PrediccionDemanda /> : <Caja />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div id="appView" className="screen active">
      <div className="app-shell">
        <Sidebar activePanel={activePanel} setActivePanel={setActivePanel} />
        <main className="main-panel">
          <header className="topbar">
            <div>
              <p className="eyebrow">Resumen</p>
              <h2 id="pageTitle">
                {activePanel === 'dashboard' && 'Dashboard'}
                {activePanel === 'admin' && 'Productos'}
                {activePanel === 'cajeros' && 'Cajeros'}
                {activePanel === 'caja' && 'Caja'}
                {activePanel === 'reportes' && 'Reportes'}
                {activePanel === 'prediccion' && 'Predicción de Demanda'}
              </h2>
            </div>
            <div className="topbar-actions">
              <button
                className="alertas-trigger"
                aria-label="Alertas de stock"
                onClick={() => setAlertasOpen(!alertasOpen)}
              >
                🔔{lowStockProducts.length > 0 ? ` (${lowStockProducts.length})` : ''}
              </button>
              {alertasOpen && lowStockProducts.length > 0 && (
                <div className="alertas-popup">
                  <div className="alertas-popup-header">
                    <strong>Alertas de stock</strong>
                    <button className="alertas-close" onClick={() => setAlertasOpen(false)}>×</button>
                  </div>
                  <ul className="alertas-list">
                    {lowStockProducts.map(item => (
                      <li key={item.id} className="alertas-item">
                        <div>
                          <strong>{item.name}</strong>
                          <small>Stock: {item.stock}</small>
                        </div>
                        <span className={`stock-tag ${getStockTagClass(item.stock)}`}>
                          {getStockStatus(item.stock).label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </header>
          {renderPanel()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;