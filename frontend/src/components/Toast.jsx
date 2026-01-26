import React, { useEffect, useState } from 'react';
import { X, Check, FileText } from './Icons'; // Assuming we can reuse icons, Check and X are standard
import '../styles/Toast.css';

const ICONS = {
    success: <Check size={20} />,
    error: <X size={20} />,
    info: <FileText size={20} />, // Fallback icon
    warning: <span style={{ fontSize: '20px', fontWeight: 'bold' }}>!</span>
};

export const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onClose();
        }, 300); // Match animation duration
    };

    return (
        <div className={`toast toast-${type} ${isExiting ? 'exiting' : ''}`}>
            <div className="toast-icon">
                {ICONS[type] || ICONS.info}
            </div>
            <div className="toast-content">
                {message}
            </div>
            <button className="toast-close" onClick={handleClose}>
                <X size={16} />
            </button>
        </div>
    );
};

export const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    {...toast}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
};
