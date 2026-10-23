const Boleta = require('../models/boletaModel');

// GET /api/boletas?evento_id=1
async function listar(req, res) {
    const boletas = await Boleta.listar(req.query.evento_id);
    res.json(boletas);
}

// GET /api/boletas/:id
async function obtener(req, res) {
    const boleta = await Boleta.obtenerPorId(req.params.id);
    if (!boleta) {
        return res.status(404).json({ mensaje: 'Boleta no encontrada' });
    }
    res.json(boleta);
}

// PATCH /api/boletas/:id/anular
async function anular(req, res) {
    const boleta = await Boleta.obtenerPorId(req.params.id);
    if (!boleta) {
        return res.status(404).json({ mensaje: 'Boleta no encontrada' });
    }
    // TODO: al anular, devolver el cupo al aforo_disponible del evento
    const actualizado = await Boleta.actualizarEstado(req.params.id, 'anulada');
    res.json(actualizado);
}

// DELETE /api/boletas/:id
async function eliminar(req, res) {
    const eliminado = await Boleta.eliminar(req.params.id);
    if (!eliminado) {
        return res.status(404).json({ mensaje: 'Boleta no encontrada' });
    }
    res.status(204).send();
}

// POST /api/boletas/validar
async function validar(req, res) {
    // TODO (validacion): buscar la boleta por codigo, revisar que este 'valida',
    // marcarla como 'usada' con la fecha (usada_en) y rechazar si ya fue usada o anulada
    res.status(501).json({ mensaje: 'Pendiente: validacion de boletas' });
}

module.exports = { listar, obtener, anular, eliminar, validar };
