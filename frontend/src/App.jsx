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
import { Clientes } from './components/Clientes';
import { Fiados } from './components/Fiados';
import { getStockStatus, getStockTagClass } from './utils/stock';

// En true muestra LoginVisual (mockup sin backend). En false usa el login
// real, conectado a la API (ver src/services/authService.js).
const DEMO_MODE = false;

function AppContent() {
  const { currentUser, loading } = useAuth();
  const { activePanel, setActivePanel, getLowStockProducts, getFiadoAlertas, formatMoney } = useApp();
  const [alertasOpen, setAlertasOpen] = useState(false);
  const lowStockProducts = getLowStockProducts();
  const fiadoAlertas = getFiadoAlertas();
  const totalAlertas = lowStockProducts.length + fiadoAlertas.length;

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
      case 'clientes':
        return <Clientes />;
      case 'fiados':
        return <Fiados />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div id="appView" className="screen active">
      <div className="app-layout">
        <div className="app-shell">
          <Sidebar activePanel={activePanel} setActivePanel={setActivePanel} />
          <main className="app-main main-panel">
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
                  {activePanel === 'clientes' && 'Clientes'}
                  {activePanel === 'fiados' && 'Fiados'}
                </h2>
              </div>
              <div className="topbar-actions">
                <button
                  className="alertas-trigger"
                  aria-label="Alertas"
                  onClick={() => setAlertasOpen(!alertasOpen)}
                >
                  🔔{totalAlertas > 0 ? ` (${totalAlertas})` : ''}
                </button>
                {alertasOpen && totalAlertas > 0 && (
                  <div className="alertas-popup">
                    <div className="alertas-popup-header">
                      <strong>Alertas</strong>
                      <button className="alertas-close" onClick={() => setAlertasOpen(false)}>×</button>
                    </div>
                    <ul className="alertas-list">
                      {fiadoAlertas.map(deudor => (
                        <li key={`fiado-${deudor.cliente_id}`} className="alertas-item">
                          <div>
                            <strong>{deudor.razon_social}</strong>
                            <small>Fiado: debe {formatMoney(Number(deudor.saldo))} de {formatMoney(Number(deudor.limite_fiado))}</small>
                          </div>
                          <span className="stock-tag tag critical">Límite</span>
                        </li>
                      ))}
                      {lowStockProducts.map(item => (
                        <li key={item.id} className="alertas-item">
                          <div>
                            <strong>{item.name}</strong>
                            <small>Stock: {item.stock}</small>
                          </div>
                          <span className={`stock-tag ${getStockTagClass(item.stock, item.minStock)}`}>
                            {getStockStatus(item.stock, item.minStock).label}
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
        <footer className="app-footer">
          Web Kiosko — Sistema de Cobros &nbsp;|&nbsp; TP Metodologías Ágiles (UNAB)
        </footer>
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