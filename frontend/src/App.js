import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import CreatePage from './pages/CreatePage';
import DocumentViewPage from './pages/DocumentViewPage';
import WorkspacePage from './pages/WorkspacePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OpenApiGuidePage from './pages/OpenApiGuidePage';
import { AuthProvider, AuthContext } from './context/AuthContext';
import './styles/global.css';

// Component to show session invalidation message
const SessionNotification = () => {
  const { sessionError, clearSessionError } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionError) {
      console.log('Session error detected:', sessionError);

      // Auto-redirect after 3 seconds
      const timer = setTimeout(() => {
        clearSessionError();
        navigate('/login', { replace: true });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [sessionError, clearSessionError, navigate]);

  if (!sessionError) return null;

  const handleDismiss = () => {
    clearSessionError();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        padding: '32px 48px',
        borderRadius: '12px',
        textAlign: 'center',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ color: '#ef4444', margin: '0 0 12px' }}>Sesión Cerrada</h2>
        <p style={{ color: '#94a3b8', margin: '0 0 24px', fontSize: '14px' }}>
          {sessionError}
        </p>
        <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '24px' }}>
          Redirigiendo al login en 3 segundos...
        </p>
        <button
          onClick={handleDismiss}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            border: 'none',
            padding: '12px 32px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Ir a Login Ahora
        </button>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading, sessionError } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;
  // If there's a session error or no user, redirect to login
  if (sessionError || !user) return <Navigate to="/login" replace />;

  return children;
};

function AppContent() {
  return (
    <>
      <Header />
      <SessionNotification />
      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<HomePage />} />
          <Route
            path="/crear"
            element={
              <ProtectedRoute>
                <CreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace"
            element={
              <ProtectedRoute>
                <WorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documento/:id"
            element={
              <ProtectedRoute>
                <DocumentViewPage />
              </ProtectedRoute>
            }
          />
          <Route path="/openapi-guide" element={<OpenApiGuidePage />} />
          {/* Redirects for old routes */}
          <Route path="/proyectos" element={<Navigate to="/workspace?section=projects" replace />} />
          <Route path="/mis-documentos" element={<Navigate to="/workspace?section=documents" replace />} />
          <Route path="/api-test" element={<Navigate to="/workspace?section=apis" replace />} />
          <Route path="/repos" element={<Navigate to="/workspace?section=repos" replace />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
