const { Router } = require('express');
const boletaController = require('../controllers/boletaController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Boleta:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         compra_id: { type: integer, example: 1 }
 *         evento_id: { type: integer, example: 1 }
 *         codigo: { type: string, example: 'TKT-8F3A2C91' }
 *         estado: { type: string, enum: [valida, usada, anulada] }
 *         usada_en: { type: string, nullable: true, example: null }
 *         creado_en: { type: string, example: '2026-11-06 18:45:51' }
 *     BoletaValidar:
 *       type: object
 *       required: [codigo]
 *       properties:
 *         codigo: { type: string, example: 'TKT-8F3A2C91' }
 */

/**
 * @openapi
 * /api/boletas:
 *   get:
 *     tags: [Boletas]
 *     summary: Lista las boletas (el comprador ve las suyas y el organizador las de sus eventos)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: evento_id
 *         required: false
 *         schema: { type: integer }
 *         description: Filtra las boletas de un evento
 *     responses:
 *       200:
 *         description: Lista de boletas
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Boleta' } }
 *       401: { description: Token requerido o invalido }
 */
router.get('/', verificarToken, boletaController.listar);

/**
 * @openapi
 * /api/boletas/validar:
 *   post:
 *     tags: [Boletas]
 *     summary: Valida una boleta en la entrada y la marca como usada (organizador)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/BoletaValidar' }
 *     responses:
 *       200: { description: Boleta valida, queda marcada como usada }
 *       400: { description: Falta el codigo }
 *       401: { description: Token requerido o invalido }
 *       403: { description: Solo el organizador del evento puede validar }
 *       404: { description: Boleta no encontrada }
 *       409: { description: La boleta ya fue usada, esta anulada, no esta pagada o el evento no esta activo }
 */
router.post('/validar', verificarToken, permitirRoles('organizador'), boletaController.validar);

/**
 * @openapi
 * /api/boletas/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema: { type: integer }
 *   get:
 *     tags: [Boletas]
 *     summary: Obtiene una boleta por id
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Boleta encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Boleta' }
 *       401: { description: Token requerido o invalido }
 *       404: { description: Boleta no encontrada }
 *   delete:
 *     tags: [Boletas]
 *     summary: Elimina una boleta (organizador)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204: { description: Boleta eliminada }
 *       401: { description: Token requerido o invalido }
 *       403: { description: Solo el organizador del evento puede eliminar }
 *       404: { description: Boleta no encontrada }
 */
router.get('/:id', verificarToken, boletaController.obtener);
router.delete('/:id', verificarToken, permitirRoles('organizador'), boletaController.eliminar);

/**
 * @openapi
 * /api/boletas/{id}/anular:
 *   patch:
 *     tags: [Boletas]
 *     summary: Anula una boleta y devuelve el cupo al evento (organizador)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Boleta anulada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Boleta' }
 *       401: { description: Token requerido o invalido }
 *       403: { description: Solo el organizador del evento puede anular }
 *       404: { description: Boleta no encontrada }
 */
router.patch('/:id/anular', verificarToken, permitirRoles('organizador'), boletaController.anular);

module.exports = router;