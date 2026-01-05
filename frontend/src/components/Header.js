import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Header.css';

function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Función para determinar si un enlace está activo
  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h1>DocApp</h1>
        </Link>
        <nav className="nav">
          <Link to="/" className={isActive('/')}>Inicio</Link>
          {user ? (
            <>
              <Link to="/proyectos" className={isActive('/proyectos')}>Proyectos</Link>
              <Link to="/mis-documentos" className={isActive('/mis-documentos')}>Mis Documentos</Link>
              <Link to="/crear" className={isActive('/crear')}>Crear</Link>
              <Link to="/api-test" className={isActive('/api-test')}>API Testing</Link>
              <Link to="/openapi-guide" className={isActive('/openapi-guide')}>Guía OpenAPI</Link>
              <button onClick={handleLogout} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
                Cerrar Sesión ({user.username})
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={isActive('/login')}>Iniciar Sesión</Link>
              <Link to="/register" className={isActive('/register')}>Registrarse</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
