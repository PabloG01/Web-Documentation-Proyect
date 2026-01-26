import React, { useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X } from './Icons';
import '../styles/Modal.css';

/**
 * Generic Modal component
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Called when modal should close
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal body content
 * @param {React.ReactNode} actions - Footer actions (buttons)
 * @param {string} size - 'small' | 'medium' | 'large'
 * @param {boolean} closeOnOverlay - Close when clicking overlay (default: true)
 * @param {boolean} showCloseButton - Show X button in header (default: true)
 */
function Modal({
    isOpen,
    onClose,
    title,
    children,
    actions,
    size = 'medium',
    closeOnOverlay = true,
    showCloseButton = true,
    className = ''
}) {
    // Handle ESC key
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape' && onClose) {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (closeOnOverlay && e.target === e.currentTarget) {
            onClose();
        }
    };

    const modalContent = (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className={`modal-container modal-${size} ${className}`}>
                {(title || showCloseButton) && (
                    <div className="modal-header">
                        {title && <h2 className="modal-title">{title}</h2>}
                        {showCloseButton && (
                            <button
                                className="modal-close-btn"
                                onClick={onClose}
                                aria-label="Cerrar"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}
                <div className="modal-body">
                    {children}
                </div>
                {actions && (
                    <div className="modal-actions">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
}

export default Modal;
