const Boleto = require('../models/boletoModel');

// GET /api/boletos?evento_id=1
async function listar(req, res) {
    const boletos = await Boleto.listar(req.query.evento_id);
    res.json(boletos);
}

// GET /api/boletos/:id
async function obtener(req, res) {
    const boleto = await Boleto.obtenerPorId(req.params.id);
    if (!boleto) {
        return res.status(404).json({ mensaje: 'Boleto no encontrado' });
    }
    res.json(boleto);
}

// PATCH /api/boletos/:id/anular
async function anular(req, res) {
    const boleto = await Boleto.obtenerPorId(req.params.id);
    if (!boleto) {
        return res.status(404).json({ mensaje: 'Boleto no encontrado' });
    }
    // TODO: al anular, devolver el cupo al aforo_disponible del evento
    const actualizado = await Boleto.actualizarEstado(req.params.id, 'anulado');
    res.json(actualizado);
}

// DELETE /api/boletos/:id
async function eliminar(req, res) {
    const eliminado = await Boleto.eliminar(req.params.id);
    if (!eliminado) {
        return res.status(404).json({ mensaje: 'Boleto no encontrado' });
    }
    res.status(204).send();
}

// POST /api/boletos/validar
async function validar(req, res) {
    // TODO (validacion): buscar el boleto por codigo, revisar que este 'valido',
    // marcarlo como 'usado' con la fecha (usado_en) y rechazar si ya fue usado o anulado
    res.status(501).json({ mensaje: 'Pendiente: validacion de boletos' });
}

module.exports = { listar, obtener, anular, eliminar, validar };
