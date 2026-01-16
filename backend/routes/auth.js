const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { usersRepository } = require('../repositories');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { validateRegister, validateLogin } = require('../middleware/validators');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoints de autenticación y gestión de usuarios
 * servers:
 *   - url: /auth
 *     description: Servidor de Autenticación
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único del usuario
 *         username:
 *           type: string
 *           description: Nombre de usuario
 *         email:
 *           type: string
 *           format: email
 *           description: Email del usuario
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *     RegisterInput:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           description: Nombre de usuario único
 *         email:
 *           type: string
 *           format: email
 *           description: Email único del usuario
 *         password:
 *           type: string
 *           minLength: 6
 *           description: Contraseña del usuario
 *     LoginInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email del usuario
 *         password:
 *           type: string
 *           description: Contraseña
 *     AuthResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         username:
 *           type: string
 *         email:
 *           type: string
 */

// Middleware to verify token
const verifyToken = asyncHandler(async (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) {
        return next(new AppError('Acceso denegado', 401));
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);

        // ALWAYS validate session token - reject old tokens without sessionToken
        const storedToken = await usersRepository.getSessionToken(verified.id);

        if (!storedToken && storedToken !== '') { // Check if user exists (null returned)
            res.clearCookie('auth_token', { httpOnly: true, secure: false, sameSite: 'lax' });
            return next(new AppError('Usuario no encontrado', 401));
        }

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
        res.clearCookie('auth_token', { httpOnly: true, secure: false, sameSite: 'lax' });

        if (err.name === 'TokenExpiredError') {
            return next(new AppError('Sesión expirada', 401));
        }
        next(new AppError('Token inválido', 401));
    }
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *           example:
 *             username: "usuario_ejemplo"
 *             email: "usuario@example.com"
 *             password: "contraseña123"
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Usuario ya existe o datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Error del servidor
 */
// Register
router.post('/register', registerLimiter, validateRegister, asyncHandler(async (req, res, next) => {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await usersRepository.findByEmailOrUsername(email, username);
    if (existingUser) {
        throw new AppError('El usuario ya existe', 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Insert user
    const newUser = await usersRepository.createUser(username, email, hash);

    res.status(201).json(newUser);
}));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *           example:
 *             email: "usuario@example.com"
 *             password: "contraseña123"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Path=/
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Error del servidor
 */
// Login
router.post('/login', authLimiter, validateLogin, asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Check user
    const user = await usersRepository.findByEmail(email);
    if (!user) {
        throw new AppError('Email o contraseña incorrectos', 400);
    }

    // Check password
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
        throw new AppError('Email o contraseña incorrectos', 400);
    }

    // Generate unique session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Store session token in database (invalidates any previous session)
    await usersRepository.updateSessionToken(user.id, sessionToken);

    // Create token with session identifier
    const token = jwt.sign(
        { id: user.id, username: user.username, sessionToken },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

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

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 */
// Logout
router.post('/logout', asyncHandler(async (req, res) => {
    // Clear session token from database if user is authenticated
    const token = req.cookies.auth_token;
    if (token) {
        try {
            const verified = jwt.verify(token, process.env.JWT_SECRET);
            await usersRepository.updateSessionToken(verified.id, null);
        } catch (err) {
            // Token invalid, just clear cookie
        }
    }

    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    });
    res.json({ message: 'Logged out successfully' });
}));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obtener información del usuario actual
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Información del usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
// Get Current User
router.get('/me', verifyToken, asyncHandler(async (req, res, next) => {
    // Avoid sending password hash or tokens
    const user = await usersRepository.findById(req.user.id);
    if (user) {
        delete user.password_hash;
        delete user.active_session_token;
        delete user.github_token;
        delete user.github_client_secret;
        delete user.bitbucket_token;
        delete user.bitbucket_refresh_token;
        delete user.bitbucket_client_secret;
    }
    res.json(user); // Send what's left (id, username, email, etc)
}));

module.exports = router;
