const express = require('express');
const { environmentsRepository } = require('../repositories');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { verifyToken } = require('../middleware/verifyToken');
const { createLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Environments
 *   description: Gestión de entornos (agrupación de proyectos)
 */

/**
 * @swagger
 * /environments:
 *   get:
 *     summary: Listar todos los entornos del usuario
 *     tags: [Environments]
 *     security:
 *       - cookieAuth: []
 */
router.get('/', verifyToken, asyncHandler(async (req, res) => {
    const result = await environmentsRepository.findAll({
        userId: req.user.id
    });
    res.json(result);
}));

/**
 * @swagger
 * /environments:
 *   post:
 *     summary: Crear un nuevo entorno
 *     tags: [Environments]
 *     security:
 *       - cookieAuth: []
 */
router.post('/', verifyToken, createLimiter, asyncHandler(async (req, res) => {
    const { name, description, color } = req.body;

    if (!name) throw new AppError('El nombre es requerido', 400);

    const environment = await environmentsRepository.create({
        userId: req.user.id,
        name,
        description,
        color
    });

    res.status(201).json(environment);
}));

/**
 * @swagger
 * /environments/{id}:
 *   put:
 *     summary: Actualizar un entorno
 *     tags: [Environments]
 */
router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, color } = req.body;

    const isOwner = await environmentsRepository.checkOwnership(id, req.user.id);
    if (!isOwner) throw new AppError('No autorizado', 403);

    // Validate name is not empty if provided
    if (name !== undefined && (!name || !name.trim())) {
        throw new AppError('El nombre no puede estar vacío', 400);
    }

    // Only update fields that are provided
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;

    if (Object.keys(updateData).length === 0) {
        throw new AppError('No se proporcionaron campos para actualizar', 400);
    }

    const environment = await environmentsRepository.update(id, updateData);
    res.json(environment);
}));

/**
 * @swagger
 * /environments/{id}:
 *   delete:
 *     summary: Eliminar un entorno
 *     tags: [Environments]
 */
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const isOwner = await environmentsRepository.checkOwnership(id, req.user.id);
    if (!isOwner) throw new AppError('No autorizado', 403);

    await environmentsRepository.delete(id);
    res.json({ message: 'Entorno eliminado correctamente' });
}));

module.exports = router;
