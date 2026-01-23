const express = require('express');
const crypto = require('crypto');
const { apiKeysRepository, projectsRepository } = require('../repositories');
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
 *               projectId:
 *                 type: integer
 *                 description: ID del proyecto asociado (opcional)
 *               expiresInDays:
 *                 type: integer
 *                 description: Días hasta expiración (opcional)
 *     responses:
 *       201:
 *         description: API Key creada (se muestra solo una vez)
 */
router.post('/', verifyToken, asyncHandler(async (req, res) => {
    const { name, projectId, expiresInDays } = req.body;

    if (!name || !name.trim()) {
        throw new AppError('El nombre es requerido', 400);
    }

    // Si se proporciona projectId, validar que existe y pertenece al usuario
    if (projectId) {
        const project = await projectsRepository.findById(projectId);
        if (!project) {
            throw new AppError('Proyecto no encontrado', 404);
        }
        if (project.user_id !== req.user.id) {
            throw new AppError('No tienes acceso a este proyecto', 403);
        }
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
        projectId: projectId || null,
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

/**
 * @swagger
 * /api-keys/{id}/permanent:
 *   delete:
 *     summary: Eliminar permanentemente API Key
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
router.delete('/:id/permanent', verifyToken, asyncHandler(async (req, res) => {
    const deleted = await apiKeysRepository.deletePermanently(req.params.id, req.user.id);

    if (!deleted) {
        throw new AppError('API Key no encontrada', 404);
    }

    res.json({ message: 'API Key eliminada permanentemente' });
}));

/**
 * @swagger
 * /api-keys/{id}/usage:
 *   get:
 *     summary: Obtener estadísticas de uso de una API Key
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
router.get('/:id/usage', verifyToken, asyncHandler(async (req, res) => {
    const stats = await apiKeysRepository.getUsageStats(req.params.id, req.user.id);

    if (!stats) {
        throw new AppError('API Key no encontrada', 404);
    }

    res.json(stats);
}));

module.exports = router;
