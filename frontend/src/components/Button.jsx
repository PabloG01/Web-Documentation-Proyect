import React from 'react';
import { Loader } from './Icons';
import '../styles/Button.css';

/**
 * Reusable Button component with multiple variants
 * @param {string} variant - 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
 * @param {string} size - 'small' | 'medium' | 'large'
 * @param {boolean} loading - Shows loading spinner
 * @param {boolean} disabled - Disables the button
 * @param {boolean} iconOnly - Button contains only an icon
 * @param {React.ReactNode} children - Button content
 */
function Button({
    variant = 'primary',
    size = 'medium',
    loading = false,
    disabled = false,
    iconOnly = false,
    className = '',
    children,
    ...props
}) {
    const classes = [
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        iconOnly && 'btn-icon-only',
        loading && 'btn-loading',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            className={classes}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <Loader size={size === 'small' ? 14 : 16} className="spin" />
                    {!iconOnly && <span>Cargando...</span>}
                </>
            ) : (
                children
            )}
        </button>
    );
}

export default Button;
