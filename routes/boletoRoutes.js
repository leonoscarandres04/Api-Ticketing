const { Router } = require('express');
const boletoController = require('../controllers/boletoController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

const router = Router();

// TODO (Swagger): documentar estas rutas igual que en eventoRoutes.js

router.get('/', verificarToken, boletoController.listar);
router.post('/validar', verificarToken, permitirRoles('organizador'), boletoController.validar);
router.get('/:id', verificarToken, boletoController.obtener);
router.patch('/:id/anular', verificarToken, permitirRoles('organizador'), boletoController.anular);
router.delete('/:id', verificarToken, permitirRoles('organizador'), boletoController.eliminar);

module.exports = router;
