import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <h1>Bienvenido a DocApp</h1>
          <p>Tu aplicación para crear documentación</p>
          <button className="btn btn-primary btn-large" onClick={() => navigate('/crear')}>
            Crear Nueva Documentación
          </button>
        </div>
      </section>

      <section className="features">
        <h2>Características</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Múltiples Formatos</h3>
            <p>Crea documentación API, manual de usuario, técnica, y más</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📋</div>
            <h3>Plantillas Predefinidas</h3>
            <p>Basadas en estándares de industria</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💾</div>
            <h3>Almacenamiento</h3>
            <p>Guarda y gestiona todos tus documentos</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Búsqueda Rápida</h3>
            <p>Encuentra documentos fácilmente</p>
          </div>
        </div>
      </section>

      <section className="cta">
        <h2>¿Listo para comenzar?</h2>
        <button className="btn btn-primary btn-large" onClick={() => navigate('/crear')}>
          Crear Documentación Ahora
        </button>
      </section>
    </div>
  );
}

export default HomePage;
