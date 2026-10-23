const { Router } = require('express');
const compraController = require('../controllers/compraController');
const { verificarToken, permitirRoles } = require('../middlewares/auth');

const router = Router();

// TODO (Swagger): documentar estas rutas igual que en eventoRoutes.js

router.get('/', verificarToken, compraController.listar);
router.post('/', verificarToken, permitirRoles('comprador'), compraController.crear);
router.get('/:id', verificarToken, compraController.obtener);
router.post('/:id/pagar', verificarToken, permitirRoles('comprador'), compraController.pagar);

module.exports = router;
