const jwt = require('jsonwebtoken');
const { pool } = require('../database');
const { AppError, asyncHandler } = require('./errorHandler');

/**
 * Centralized Token Verification Middleware
 * 
 * Features:
 * - Validates JWT token from cookie
 * - Validates session token against database (single-session enforcement)
 * - Clears cookie if session was invalidated by another login
 */
const verifyToken = asyncHandler(async (req, res, next) => {
    const token = req.cookies.auth_token;

    if (!token) {
        return next(new AppError('Acceso denegado', 401));
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);

        // Validate session token against database for single-session enforcement
        if (verified.sessionToken) {
            const userResult = await pool.query(
                'SELECT active_session_token FROM users WHERE id = $1',
                [verified.id]
            );

            if (userResult.rows.length === 0) {
                return next(new AppError('Usuario no encontrado', 401));
            }

            const storedToken = userResult.rows[0].active_session_token;

            // If session tokens don't match, session was invalidated by another login
            if (storedToken !== verified.sessionToken) {
                res.clearCookie('auth_token', {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax'
                });
                return next(new AppError('Sesión cerrada desde otro dispositivo', 401));
            }
        }

        req.user = verified;
        next();
    } catch (err) {
        console.error('Token verification error:', err.message);

        // Clear invalid cookie
        res.clearCookie('auth_token', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        });

        next(new AppError('Token inválido o expirado', 401));
    }
});

module.exports = { verifyToken };
