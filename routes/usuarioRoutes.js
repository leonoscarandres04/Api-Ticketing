const { Router } = require('express');
const usuarioController = require('../controllers/usuarioController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

const router = Router();

// TODO (Swagger): documentar estas rutas igual que en eventoRoutes.js

router.get('/', verificarToken, permitirRoles('organizador'), usuarioController.listar);
router.get('/:id', verificarToken, usuarioController.obtener);

module.exports = router;
