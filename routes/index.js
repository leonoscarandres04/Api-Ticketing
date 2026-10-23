const { Router } = require('express');

const router = Router();

// Endpoint de prueba
router.get('/', (req, res) => {
    res.json({ mensaje: "¡API de Ticketing funcionando correctamente!" });
});

router.use('/auth', require('./authRoutes'));
router.use('/usuarios', require('./usuarioRoutes'));
router.use('/eventos', require('./eventoRoutes'));
router.use('/compras', require('./compraRoutes'));
router.use('/boletos', require('./boletoRoutes'));

module.exports = router;
