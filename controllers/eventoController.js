const Evento = require('../models/eventoModel');

// GET /api/eventos
async function listar(req, res) {
    const eventos = await Evento.listar();
    res.json(eventos);
}

// GET /api/eventos/:id
async function obtener(req, res) {
    const evento = await Evento.obtenerPorId(req.params.id);
    if (!evento) {
        return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }
    res.json(evento);
}

// POST /api/eventos
async function crear(req, res) {
    // TODO (autenticacion): tomar organizador_id del token (req.usuario.id) y no del body
    const { organizador_id, nombre, lugar, fecha, aforo_total } = req.body;
    if (!organizador_id || !nombre || !lugar || !fecha || !aforo_total) {
        return res.status(400).json({ mensaje: 'organizador_id, nombre, lugar, fecha y aforo_total son obligatorios' });
    }
    if (!Number.isInteger(aforo_total) || aforo_total <= 0) {
        return res.status(400).json({ mensaje: 'aforo_total debe ser un numero entero mayor a 0' });
    }

    const evento = await Evento.crear(req.body);
    res.status(201).json(evento);
}

// PUT /api/eventos/:id
async function actualizar(req, res) {
    const existe = await Evento.obtenerPorId(req.params.id);
    if (!existe) {
        return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }
    // TODO (autenticacion): solo el organizador dueño del evento puede editarlo
    const evento = await Evento.actualizar(req.params.id, req.body);
    res.json(evento);
}

// DELETE /api/eventos/:id
async function eliminar(req, res) {
    // TODO: si el evento ya tiene compras, cancelarlo (estado = 'cancelado') en vez de borrarlo
    const eliminado = await Evento.eliminar(req.params.id);
    if (!eliminado) {
        return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }
    res.status(204).send();
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
