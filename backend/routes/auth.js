const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { validateRegister, validateLogin } = require('../middleware/validators');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');
const router = express.Router();


// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) {
        return next(new AppError('Acceso denegado', 401));
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        next(new AppError('Token inválido', 400));
    }
};

// Register
router.post('/register', registerLimiter, validateRegister, asyncHandler(async (req, res, next) => {
    const { username, email, password } = req.body;

    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (userCheck.rows.length > 0) {
        throw new AppError('El usuario ya existe', 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Insert user
    const newUser = await pool.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
        [username, email, hash]
    );

    res.status(201).json(newUser.rows[0]);
}));

// Login
router.post('/login', authLimiter, validateLogin, asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Check user
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
        throw new AppError('Email o contraseña incorrectos', 400);
    }
    const user = userResult.rows[0];

    // Check password
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
        throw new AppError('Email o contraseña incorrectos', 400);
    }

    // Create token
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Set cookie (CONFIGURACIÓN PARA LAN - HTTP)
    // NOTA: sameSite 'lax' funciona con HTTP, pero el usuario debe acceder 
    // al frontend y backend usando la MISMA IP (no mezclar localhost con IP)
    res.cookie('auth_token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({ id: user.id, username: user.username, email: user.email });
}));

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    });
    res.json({ message: 'Logged out successfully' });
});

// Get Current User
router.get('/me', verifyToken, asyncHandler(async (req, res, next) => {
    const user = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
    res.json(user.rows[0]);
}));

module.exports = router;
