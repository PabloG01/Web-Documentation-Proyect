import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Header.css';

function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h1>DocApp</h1>
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Inicio</Link>
          {user ? (
            <>
              <Link to="/proyectos" className="nav-link">Proyectos</Link>
              <Link to="/mis-documentos" className="nav-link">Mis Documentos</Link>
              <Link to="/crear" className="nav-link active">Crear</Link>
              <Link to="/api-test" className="nav-link">API Testing</Link>
              <Link to="/openapi-guide" className="nav-link">Guía OpenAPI</Link>
              <button onClick={handleLogout} className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
                Cerrar Sesión ({user.username})
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Iniciar Sesión</Link>
              <Link to="/register" className="nav-link active">Registrarse</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
