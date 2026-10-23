const { Router } = require('express');
const authController = require('../controllers/authController');

const router = Router();

// TODO (Swagger): documentar estas rutas igual que en eventoRoutes.js

router.post('/registro', authController.registro);
router.post('/login', authController.login);

module.exports = router;
