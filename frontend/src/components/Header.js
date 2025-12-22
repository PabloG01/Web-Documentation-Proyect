import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h1>📚 DocApp</h1>
        </Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Inicio</Link>
          <Link to="/proyectos" className="nav-link">Proyectos</Link>
          <Link to="/mis-documentos" className="nav-link">Mis Documentos</Link>
          <Link to="/crear" className="nav-link active">Crear</Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
