

import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import CreatePage from './pages/CreatePage';
import DocumentsListPage from './pages/DocumentsListPage';
import DocumentViewPage from './pages/DocumentViewPage';
import ProjectsPage from './pages/ProjectsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ApiTestPage from './pages/ApiTestPage';
import OpenApiGuidePage from './pages/OpenApiGuidePage';
import ReposPage from './pages/ReposPage';
import { AuthProvider, AuthContext } from './context/AuthContext';
import './styles/global.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
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
              path="/mis-documentos"
              element={
                <ProtectedRoute>
                  <DocumentsListPage />
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
            <Route
              path="/proyectos"
              element={
                <ProtectedRoute>
                  <ProjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/api-test"
              element={
                <ProtectedRoute>
                  <ApiTestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/repos"
              element={
                <ProtectedRoute>
                  <ReposPage />
                </ProtectedRoute>
              }
            />
            <Route path="/openapi-guide" element={<OpenApiGuidePage />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;
