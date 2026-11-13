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
 *         comprador_id: { type: integer, example: 2 }
 *         evento_id: { type: integer, example: 1 }
 *         cantidad: { type: integer, example: 2 }
 *         total: { type: number, example: 100000 }
 *         estado: { type: string, enum: [pendiente, pagada, cancelada] }
 *         creado_en: { type: string, example: '2026-11-12 20:00:00' }
 *     CompraNueva:
 *       type: object
 *       required: [evento_id, comprador_id, cantidad]
 *       properties:
 *         evento_id: { type: integer, example: 1 }
 *         comprador_id: { type: integer, example: 2 }
 *         cantidad: { type: integer, example: 2 }
 */

/**
 * @openapi
 * /api/compras:
 *   get:
 *     tags: [Compras]
 *     summary: Lista todas las compras (opcionalmente filtradas por comprador_id)
 *     parameters:
 *       - in: query
 *         name: comprador_id
 *         required: false
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de compras
 *   post:
 *     tags: [Compras]
 *     summary: Realiza una compra de boletas con control transaccional de aforo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CompraNueva' }
 *     responses:
 *       201: { description: Compra exitosa y boletas generadas }
 *       400: { description: Datos invalidos o cantidad menor o igual a 0 }
 *       404: { description: Evento no encontrado }
 *       409: { description: Aforo insuficiente o evento no activo }
 */
router.get('/', compraController.listar);
router.post('/', verificarToken, permitirRoles('comprador'), compraController.crear);

/**
 * @openapi
 * /api/compras/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema: { type: integer }
 *   get:
 *     tags: [Compras]
 *     summary: Obtiene una compra por id
 *     responses:
 *       200: { description: Compra encontrada }
 *       404: { description: Compra no encontrada }
 */
router.get('/:id', compraController.obtener);

/**
 * @openapi
 * /api/compras/{id}/pagar:
 *   post:
 *     tags: [Compras]
 *     summary: Simula el pago de una compra pendiente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Pago simulado procesado correctamente }
 *       403: { description: No tienes permiso para pagar la compra de otro comprador }
 *       404: { description: Compra no encontrada }
 *       409: { description: La compra ya fue pagada o esta cancelada }
 */
router.post('/:id/pagar', verificarToken, permitirRoles('comprador'), compraController.pagar);
router.patch('/:id/pagar', verificarToken, permitirRoles('comprador'), compraController.pagar);

module.exports = router;