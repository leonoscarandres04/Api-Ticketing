const { Router } = require('express');
const usuarioController = require('../controllers/usuarioController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

const router = Router();

/**
 * @openapi
 * /api/usuarios:
 *   get:
 *     tags: [Usuarios]
 *     summary: Lista todos los usuarios (organizador)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios (sin password)
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Usuario' } }
 *       401: { description: Token requerido o invalido }
 *       403: { description: Solo el organizador puede ver la lista }
 */
router.get('/', verificarToken, permitirRoles('organizador'), usuarioController.listar);

/**
 * @openapi
 * /api/usuarios/{id}:
 *   get:
 *     tags: [Usuarios]
 *     summary: Obtiene un usuario por id (el comprador solo puede ver el suyo)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Usuario encontrado (sin password)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Usuario' }
 *       401: { description: Token requerido o invalido }
 *       403: { description: Un comprador solo puede ver su propio usuario }
 *       404: { description: Usuario no encontrado }
 */
router.get('/:id', verificarToken, usuarioController.obtener);

module.exports = router;