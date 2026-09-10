import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Login } from './components/Login';
import { LoginVisual } from './components/LoginVisual';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Admin } from './components/Admin';
import { Caja } from './components/Caja';
import { Reportes } from './components/Reportes';

const DEMO_MODE = true;

function AppContent() {
  const { currentUser } = useAuth();
  const { activePanel, setActivePanel } = useApp();

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
      case 'caja':
        return <Caja />;
      case 'reportes':
        return <Reportes />;
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
                {activePanel === 'caja' && 'Caja'}
                {activePanel === 'reportes' && 'Reportes'}
              </h2>
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