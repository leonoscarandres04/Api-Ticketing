const express = require('express');
const router = express.Router();
const { validarBoleta, anularBoleta } = require('../controllers/boletaController');

router.post('/validar', validarBoleta);
router.post('/:id/anular', anularBoleta); 

module.exports = router;