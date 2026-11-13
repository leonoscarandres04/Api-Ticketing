const { Router } = require('express');
const authController = require('../controllers/authController');

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 3 }
 *         nombre: { type: string, example: Isabela }
 *         email: { type: string, example: isa@test.com }
 *         rol: { type: string, enum: [organizador, comprador] }
 *         creado_en: { type: string, example: '2026-11-06 17:09:48' }
 *     RegistroNuevo:
 *       type: object
 *       required: [nombre, email, password]
 *       properties:
 *         nombre: { type: string, example: Isabela }
 *         email: { type: string, example: isa@test.com }
 *         password: { type: string, minLength: 6, example: '123456' }
 *         rol: { type: string, enum: [organizador, comprador], default: comprador }
 *     LoginNuevo:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email: { type: string, example: organizador@ticketing.com }
 *         password: { type: string, example: '123456' }
 *     LoginRespuesta:
 *       type: object
 *       properties:
 *         token: { type: string, example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... }
 *         usuario:
 *           type: object
 *           properties:
 *             id: { type: integer, example: 1 }
 *             nombre: { type: string, example: Organizador Demo }
 *             email: { type: string, example: organizador@ticketing.com }
 *             rol: { type: string, example: organizador }
 */

/**
 * @openapi
 * /api/auth/registro:
 *   post:
 *     tags: [Auth]
 *     summary: Registra un usuario (organizador o comprador)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegistroNuevo' }
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Usuario' }
 *       400: { description: Datos invalidos }
 *       409: { description: Ya existe un usuario con ese email }
 */
router.post('/registro', authController.registro);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesion y devuelve un token JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginNuevo' }
 *     responses:
 *       200:
 *         description: Login correcto, devuelve el token y el usuario
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/LoginRespuesta' }
 *       400: { description: Faltan datos }
 *       401: { description: Credenciales invalidas }
 */
router.post('/login', authController.login);

module.exports = router;