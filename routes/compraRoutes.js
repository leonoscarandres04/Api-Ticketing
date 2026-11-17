const { Router } = require('express');
const compraController = require('../controllers/compraController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Compra:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         comprador_id: { type: integer, example: 3 }
 *         evento_id: { type: integer, example: 1 }
 *         cantidad: { type: integer, example: 2 }
 *         total: { type: number, example: 100000 }
 *         estado: { type: string, enum: [pendiente, pagada, cancelada] }
 *         creado_en: { type: string, example: '2026-11-06 18:45:51' }
 *         segundos_para_pagar: { type: integer, nullable: true, example: 840, description: Solo en compras pendientes }
 *     CompraNueva:
 *       type: object
 *       required: [evento_id]
 *       description: En eventos de entrada general se manda cantidad; en eventos con sillas numeradas se manda la lista de sillas. Maximo 10 boletas por persona en cada evento
 *       properties:
 *         evento_id: { type: integer, example: 1 }
 *         cantidad: { type: integer, minimum: 1, maximum: 10, example: 2 }
 *         sillas: { type: array, items: { type: integer }, example: [5, 6] }
 */

/**
 * @openapi
 * /api/compras:
 *   get:
 *     tags: [Compras]
 *     summary: Lista las compras
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de compras
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Compra' } }
 *       401: { description: Token requerido o invalido }
 *   post:
 *     tags: [Compras]
 *     summary: Crea una compra, descuenta el aforo y genera las boletas (comprador)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CompraNueva' }
 *     responses:
 *       201:
 *         description: Compra creada con sus boletas
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Compra' }
 *       400: { description: Datos invalidos }
 *       401: { description: Token requerido o invalido }
 *       403: { description: Solo el comprador puede comprar }
 *       404: { description: Evento no encontrado }
 *       409: { description: No hay aforo suficiente, el evento no esta activo o ya paso }
 */
router.get('/', verificarToken, compraController.listar);
router.post('/', verificarToken, permitirRoles('comprador'), compraController.crear);

/**
 * @openapi
 * /api/compras/{id}:
 *   get:
 *     tags: [Compras]
 *     summary: Obtiene una compra por id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Compra encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Compra' }
 *       401: { description: Token requerido o invalido }
 *       404: { description: Compra no encontrada }
 */
router.get('/:id', verificarToken, compraController.obtener);

/**
 * @openapi
 * /api/compras/{id}/pagar:
 *   post:
 *     tags: [Compras]
 *     summary: Paga la compra (pago simulado); hay 15 minutos para pagar o la compra vence (comprador)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Pago simulado aprobado, la compra queda pagada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Compra' }
 *       401: { description: Token requerido o invalido }
 *       403: { description: Solo el comprador puede pagar }
 *       404: { description: Compra no encontrada }
 *       409: { description: La compra ya fue pagada o vencio (pasaron mas de 15 minutos) }
 */
router.post('/:id/pagar', verificarToken, permitirRoles('comprador'), compraController.pagar);
router.patch('/:id/pagar', verificarToken, permitirRoles('comprador'), compraController.pagar);

module.exports = router;