const { Router } = require('express');
const eventoController = require('../controllers/eventoController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Evento:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         organizador_id: { type: integer, example: 1 }
 *         nombre: { type: string, example: Concierto de Rock }
 *         descripcion: { type: string, example: Bandas locales en vivo }
 *         lugar: { type: string, example: Teatro Jorge Eliecer Gaitan }
 *         fecha: { type: string, example: '2026-12-05 19:00:00' }
 *         aforo_total: { type: integer, example: 100 }
 *         aforo_disponible: { type: integer, example: 100 }
 *         precio: { type: number, example: 50000 }
 *         estado: { type: string, enum: [activo, cancelado, finalizado] }
 *     EventoNuevo:
 *       type: object
 *       required: [organizador_id, nombre, lugar, fecha, aforo_total]
 *       properties:
 *         organizador_id: { type: integer, example: 1 }
 *         nombre: { type: string, example: Concierto de Rock }
 *         descripcion: { type: string, example: Bandas locales en vivo }
 *         lugar: { type: string, example: Teatro Jorge Eliecer Gaitan }
 *         fecha: { type: string, example: '2026-12-05 19:00:00' }
 *         aforo_total: { type: integer, example: 100 }
 *         precio: { type: number, example: 50000 }
 */

/**
 * @openapi
 * /api/eventos:
 *   get:
 *     tags: [Eventos]
 *     summary: Lista todos los eventos
 *     responses:
 *       200:
 *         description: Lista de eventos
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Evento' } }
 *   post:
 *     tags: [Eventos]
 *     summary: Crea un evento (organizador)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EventoNuevo' }
 *     responses:
 *       201: { description: Evento creado }
 *       400: { description: Datos invalidos }
 */
router.get('/', eventoController.listar);
router.post('/', verificarToken, permitirRoles('organizador'), eventoController.crear);

/**
 * @openapi
 * /api/eventos/{id}:
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema: { type: integer }
 *   get:
 *     tags: [Eventos]
 *     summary: Obtiene un evento por id
 *     responses:
 *       200: { description: Evento encontrado }
 *       404: { description: Evento no encontrado }
 *   put:
 *     tags: [Eventos]
 *     summary: Actualiza un evento (organizador)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EventoNuevo' }
 *     responses:
 *       200: { description: Evento actualizado }
 *       404: { description: Evento no encontrado }
 *   delete:
 *     tags: [Eventos]
 *     summary: Elimina un evento (organizador)
 *     responses:
 *       204: { description: Evento eliminado }
 *       404: { description: Evento no encontrado }
 */
router.get('/:id', eventoController.obtener);
router.put('/:id', verificarToken, permitirRoles('organizador'), eventoController.actualizar);
router.delete('/:id', verificarToken, permitirRoles('organizador'), eventoController.eliminar);

module.exports = router;
