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
 *         codigo: { type: string, example: A1B2C3D4 }
 *         estado: { type: string, enum: [valida, usada, anulada] }
 *         usada_en: { type: string, nullable: true, example: null }
 *         creado_en: { type: string, example: '2026-11-12 20:00:00' }
 */

/**
 * @openapi
 * /api/boletas:
 *   get:
 *     tags: [Boletas]
 *     summary: Lista todas las boletas (opcionalmente filtradas por evento_id)
 *     parameters:
 *       - in: query
 *         name: evento_id
 *         required: false
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de boletas
 */
router.get('/', boletaController.listar);

/**
 * @openapi
 * /api/boletas/validar:
 *   post:
 *     tags: [Boletas]
 *     summary: Valida una boleta por su codigo unico y la marca como usada
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [codigo]
 *             properties:
 *               codigo: { type: string, example: A1B2C3D4 }
 *     responses:
 *       200: { description: Boleta validada correctamente }
 *       400: { description: Codigo obligatorio }
 *       404: { description: Boleta no encontrada }
 *       409: { description: La boleta ya fue usada o esta anulada }
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
 *     responses:
 *       200: { description: Boleta encontrada }
 *       404: { description: Boleta no encontrada }
 *   delete:
 *     tags: [Boletas]
 *     summary: Elimina una boleta (organizador)
 *     responses:
 *       204: { description: Boleta eliminada }
 *       404: { description: Boleta no encontrada }
 */
router.get('/:id', boletaController.obtener);
router.delete('/:id', verificarToken, permitirRoles('organizador'), boletaController.eliminar);

/**
 * @openapi
 * /api/boletas/{id}/anular:
 *   patch:
 *     tags: [Boletas]
 *     summary: Anula una boleta y devuelve el cupo al evento
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Boleta anulada correctamente }
 *       404: { description: Boleta no encontrada }
 *       409: { description: La boleta ya esta anulada o fue usada }
 */
router.patch('/:id/anular', verificarToken, permitirRoles('organizador', 'comprador'), boletaController.anular);

module.exports = router;