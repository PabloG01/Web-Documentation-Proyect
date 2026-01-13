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
      // Show alert and redirect to login
      alert(sessionError);
      clearSessionError();
      navigate('/login', { replace: true });
    }
  }, [sessionError, clearSessionError, navigate]);

  return null;
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

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
