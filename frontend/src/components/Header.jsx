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
    if (path === '/workspace') {
      return location.pathname.startsWith('/workspace') ? 'nav-link active' : 'nav-link';
    }
    if (path === '/guides') {
      return location.pathname.startsWith('/guides') ? 'nav-link active' : 'nav-link';
    }
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
          <Link to="/guides" className={isActive('/guides')}>Guías</Link>
          {user ? (
            <>
              <Link to="/workspace" className={isActive('/workspace')}>Workspace</Link>
              <Link to="/crear" className={isActive('/crear')}>Crear</Link>
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

