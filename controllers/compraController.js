const Compra = require('../models/compraModel');

// GET /api/compras
async function listar(req, res) {
    // TODO (autenticacion): el comprador solo ve sus compras (Compra.listarPorComprador)
    const compras = await Compra.listar();
    res.json(compras);
}

// GET /api/compras/:id
async function obtener(req, res) {
    const compra = await Compra.obtenerPorId(req.params.id);
    if (!compra) {
        return res.status(404).json({ mensaje: 'Compra no encontrada' });
    }
    res.json(compra);
}

// POST /api/compras
async function crear(req, res) {
    // TODO (flujo de compra): recibir evento_id y cantidad, controlar el aforo y generar los boletos
    res.status(501).json({ mensaje: 'Pendiente: flujo de compra' });
}

// POST /api/compras/:id/pagar
async function pagar(req, res) {
    // TODO (flujo de compra): simular el pago y pasar la compra a 'pagada'
    res.status(501).json({ mensaje: 'Pendiente: pago simulado' });
}

module.exports = { listar, obtener, crear, pagar };
