const Evento = require('../models/eventoModel');

const ESTADOS = ['activo', 'cancelado', 'finalizado'];
const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

// Revisa que la fecha tenga formato AAAA-MM-DD HH:MM(:SS), que exista y que sea futura
function revisarFecha(fecha) {
    const partes = typeof fecha === 'string' && fecha.match(FORMATO_FECHA);
    if (!partes) {
        return 'fecha debe tener el formato AAAA-MM-DD HH:MM:SS';
    }
    const [, anio, mes, dia, hora, minuto] = partes.map(Number);
    const d = new Date(anio, mes - 1, dia, hora, minuto);
    // Si la fecha no existe (ej. 30 de febrero) el Date se corre a otro dia
    if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia || hora > 23 || minuto > 59) {
        return 'fecha no es una fecha valida';
    }
    if (d <= new Date()) {
        return 'fecha debe ser en el futuro';
    }
    return null;
}

// Revisa los datos de un evento; en una edicion (parcial) solo los campos que lleguen
function revisarEvento(datos, parcial) {
    const { nombre, lugar, descripcion, fecha, aforo_total, precio, estado } = datos;

    for (const [campo, valor] of [['nombre', nombre], ['lugar', lugar]]) {
        if (valor === undefined && parcial) continue;
        if (typeof valor !== 'string' || !valor.trim()) {
            return `${campo} es obligatorio`;
        }
        if (valor.trim().length > 150) {
            return `${campo} no puede tener mas de 150 caracteres`;
        }
    }
    if (descripcion !== undefined && descripcion !== null && typeof descripcion !== 'string') {
        return 'descripcion debe ser texto';
    }
    if (fecha !== undefined || !parcial) {
        const error = revisarFecha(fecha);
        if (error) return error;
    }
    if (!parcial && (!Number.isInteger(aforo_total) || aforo_total <= 0)) {
        return 'aforo_total debe ser un numero entero mayor a 0';
    }
    if (precio !== undefined && (typeof precio !== 'number' || !Number.isFinite(precio) || precio < 0)) {
        return 'precio debe ser un numero mayor o igual a 0';
    }
    if (estado !== undefined && !ESTADOS.includes(estado)) {
        return `estado debe ser ${ESTADOS.join(', ')}`;
    }
    return null;
}

// Quita los espacios de sobra en los textos
function limpiar(datos) {
    const limpios = { ...datos };
    for (const campo of ['nombre', 'lugar', 'descripcion']) {
        if (typeof limpios[campo] === 'string') limpios[campo] = limpios[campo].trim();
    }
    return limpios;
}

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
    const error = revisarEvento(req.body, false);
    if (error) {
        return res.status(400).json({ mensaje: error });
    }

    // El organizador es siempre el que inicio sesion, no el que venga en el body
    const evento = await Evento.crear({ ...limpiar(req.body), organizador_id: req.usuario.id });
    res.status(201).json(evento);
}

// PUT /api/eventos/:id
async function actualizar(req, res) {
    const existe = await Evento.obtenerPorId(req.params.id);
    if (!existe) {
        return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }
    if (existe.organizador_id !== req.usuario.id) {
        return res.status(403).json({ mensaje: 'Solo el organizador del evento puede editarlo' });
    }
    const error = revisarEvento(req.body, true);
    if (error) {
        return res.status(400).json({ mensaje: error });
    }
    const evento = await Evento.actualizar(req.params.id, limpiar(req.body));
    res.json(evento);
}

// DELETE /api/eventos/:id
async function eliminar(req, res) {
    const existe = await Evento.obtenerPorId(req.params.id);
    if (!existe) {
        return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }
    if (existe.organizador_id !== req.usuario.id) {
        return res.status(403).json({ mensaje: 'Solo el organizador del evento puede eliminarlo' });
    }
    // TODO: si el evento ya tiene compras, cancelarlo (estado = 'cancelado') en vez de borrarlo
    await Evento.eliminar(req.params.id);
    res.status(204).send();
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
