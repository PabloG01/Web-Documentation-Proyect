import React from 'react';
import '../styles/Pagination.css';

/**
 * Componente de paginación reutilizable
 * @param {Object} pagination - Objeto con información de paginación del servidor
 * @param {Function} onPageChange - Función callback cuando cambia la página
 */
function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const { currentPage, totalPages, totalItems, itemsPerPage, hasNextPage, hasPrevPage } = pagination;

  // Calcular rango de páginas a mostrar
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5; // Máximo de números de página visibles
    
    if (totalPages <= maxVisible) {
      // Mostrar todas las páginas si son pocas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar páginas con ellipsis
      if (currentPage <= 3) {
        // Inicio: 1 2 3 4 ... último
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Final: 1 ... antepenúltimo penúltimo último
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Medio: 1 ... anterior actual siguiente ... último
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();
  
  // Calcular rango de items mostrados
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Mostrando <strong>{startItem}-{endItem}</strong> de <strong>{totalItems}</strong> resultados
      </div>
      
      <div className="pagination-controls">
        {/* Botón: Primera página */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={!hasPrevPage}
          title="Primera página"
        >
          <span>«</span>
        </button>

        {/* Botón: Anterior */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage}
          title="Página anterior"
        >
          <span>‹</span>
        </button>

        {/* Números de página */}
        {pageNumbers.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis">
              ...
            </span>
          ) : (
            <button
              key={page}
              className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        ))}

        {/* Botón: Siguiente */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          title="Página siguiente"
        >
          <span>›</span>
        </button>

        {/* Botón: Última página */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage}
          title="Última página"
        >
          <span>»</span>
        </button>
      </div>

      {/* Selector de items por página (opcional) */}
      <div className="pagination-page-size">
        <label htmlFor="page-size">Items por página:</label>
        <select
          id="page-size"
          value={itemsPerPage}
          onChange={(e) => onPageChange(1, parseInt(e.target.value))}
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </div>
  );
}

export default Pagination;
