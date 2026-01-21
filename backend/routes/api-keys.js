const express = require('express');
const crypto = require('crypto');
const { apiKeysRepository } = require('../repositories');
const { verifyToken } = require('../middleware/verifyToken');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: API Keys
 *   description: Gestión de API Keys para autenticación M2M
 */

/**
 * @swagger
 * /api-keys:
 *   post:
 *     summary: Generar nueva API Key
 *     tags: [API Keys]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre descriptivo de la key
 *               expiresInDays:
 *                 type: integer
 *                 description: Días hasta expiración (opcional)
 *     responses:
 *       201:
 *         description: API Key creada (se muestra solo una vez)
 */
router.post('/', verifyToken, asyncHandler(async (req, res) => {
    const { name, expiresInDays } = req.body;

    if (!name || !name.trim()) {
        throw new AppError('El nombre es requerido', 400);
    }

    // Generar key segura (64 caracteres hex = 32 bytes)
    const keySecret = crypto.randomBytes(32).toString('hex');
    const prefix = `sk_${crypto.randomBytes(4).toString('hex')}`;
    const fullKey = `${prefix}_${keySecret}`;

    // IMPORTANTE: Hash de la key COMPLETA (no solo el secret)
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

    // Calcular fecha de expiración si se proporciona
    const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    const apiKey = await apiKeysRepository.create({
        userId: req.user.id,
        name: name.trim(),
        keyHash,
        prefix,
        expiresAt
    });

    // IMPORTANTE: Retornar key completa SOLO esta vez
    res.status(201).json({
        ...apiKey,
        key: fullKey,  // Solo se muestra al crear
        warning: 'Guarda esta key ahora. No se volverá a mostrar.'
    });
}));

/**
 * @swagger
 * /api-keys:
 *   get:
 *     summary: Listar API Keys del usuario
 *     tags: [API Keys]
 *     security:
 *       - cookieAuth: []
 */
router.get('/', verifyToken, asyncHandler(async (req, res) => {
    const keys = await apiKeysRepository.findByUser(req.user.id);
    res.json(keys);
}));

/**
 * @swagger
 * /api-keys/{id}:
 *   delete:
 *     summary: Revocar (desactivar) API Key
 *     tags: [API Keys]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
    const revoked = await apiKeysRepository.revoke(req.params.id, req.user.id);

    if (!revoked) {
        throw new AppError('API Key no encontrada', 404);
    }

    res.json({ message: 'API Key revocada correctamente' });
}));

module.exports = router;
