const express = require('express');
const router = express.Router();
const { crearCompra, pagarCompra } = require('../controllers/compraController');

router.post('/', crearCompra);
router.post('/:id/pagar', pagarCompra);

module.exports = router;