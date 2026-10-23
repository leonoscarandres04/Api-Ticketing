const { Router } = require('express');
const boletaController = require('../controllers/boletaController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

const router = Router();

// TODO (Swagger): documentar estas rutas igual que en eventoRoutes.js

router.get('/', verificarToken, boletaController.listar);
router.post('/validar', verificarToken, permitirRoles('organizador'), boletaController.validar);
router.get('/:id', verificarToken, boletaController.obtener);
router.patch('/:id/anular', verificarToken, permitirRoles('organizador'), boletaController.anular);
router.delete('/:id', verificarToken, permitirRoles('organizador'), boletaController.eliminar);

module.exports = router;
