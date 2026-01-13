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
 * - Rejects old tokens that don't have sessionToken
 */
const verifyToken = asyncHandler(async (req, res, next) => {
    const token = req.cookies.auth_token;

    if (!token) {
        return next(new AppError('Acceso denegado', 401));
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);

        // ALWAYS validate session token - reject old tokens without sessionToken
        const userResult = await pool.query(
            'SELECT active_session_token FROM users WHERE id = $1',
            [verified.id]
        );

        if (userResult.rows.length === 0) {
            res.clearCookie('auth_token', { httpOnly: true, secure: false, sameSite: 'lax' });
            return next(new AppError('Usuario no encontrado', 401));
        }

        const storedToken = userResult.rows[0].active_session_token;

        // If JWT doesn't have sessionToken, it's an old token - force re-login
        if (!verified.sessionToken) {
            console.log('Old token detected without sessionToken, forcing re-login');
            res.clearCookie('auth_token', { httpOnly: true, secure: false, sameSite: 'lax' });
            return next(new AppError('Sesión expirada. Por favor inicia sesión nuevamente.', 401));
        }

        // If session tokens don't match, session was invalidated by another login
        if (storedToken !== verified.sessionToken) {
            console.log(`Session mismatch for user ${verified.id}: stored=${storedToken?.substring(0, 8)}... vs jwt=${verified.sessionToken?.substring(0, 8)}...`);
            res.clearCookie('auth_token', { httpOnly: true, secure: false, sameSite: 'lax' });
            return next(new AppError('Sesión cerrada desde otro dispositivo', 401));
        }

        req.user = verified;
        next();
    } catch (err) {
        console.error('Token verification error:', err.message);

        // Clear invalid cookie
        res.clearCookie('auth_token', { httpOnly: true, secure: false, sameSite: 'lax' });

        if (err.name === 'TokenExpiredError') {
            return next(new AppError('Sesión expirada', 401));
        }
        next(new AppError('Token inválido', 401));
    }
});

module.exports = { verifyToken };
