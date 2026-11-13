const { pool } = require('../config/database');
const Boleta = require('../models/boletaModel');

// GET /api/boletas
const listar = async (req, res) => {
    const boletas = await Boleta.listar(req.query.evento_id);
    res.json(boletas);
};

// GET /api/boletas/:id
const obtener = async (req, res) => {
    const boleta = await Boleta.obtenerPorId(req.params.id);
    if (!boleta) {
        return res.status(404).json({ mensaje: 'Boleta no encontrada' });
    }
    res.json(boleta);
};

// DELETE /api/boletas/:id
const eliminar = async (req, res) => {
    const eliminada = await Boleta.eliminar(req.params.id);
    if (!eliminada) {
        return res.status(404).json({ mensaje: 'Boleta no encontrada' });
    }
    res.status(204).send();
};

// POST /api/boletas/validar
const validarBoleta = async (req, res) => {
    const codigo = req.body.codigo || req.params.codigo;
    if (!codigo) {
        return res.status(400).json({ mensaje: 'El codigo de la boleta es obligatorio' });
    }

    const [boletas] = await pool.query('SELECT id, estado FROM boletas WHERE codigo = ?', [codigo]);
    if (boletas.length === 0) {
        return res.status(404).json({ mensaje: 'Boleta no encontrada' });
    }

    const boleta = boletas[0];
    if (boleta.estado === 'usada') {
        return res.status(409).json({ mensaje: 'Esta boleta ya fue usada' });
    }
    if (boleta.estado === 'anulada') {
        return res.status(409).json({ mensaje: 'Esta boleta ha sido anulada' });
    }

    await pool.query('UPDATE boletas SET estado = ?, usada_en = NOW() WHERE id = ?', ['usada', boleta.id]);
    res.json({ mensaje: 'Boleta validada correctamente. Acceso permitido.' });
};

// PATCH /api/boletas/:id/anular
const anularBoleta = async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [boletas] = await connection.query('SELECT evento_id, estado FROM boletas WHERE id = ? FOR UPDATE', [id]);
        if (boletas.length === 0) {
            await connection.rollback();
            return res.status(404).json({ mensaje: 'Boleta no encontrada' });
        }

        const boleta = boletas[0];
        if (boleta.estado === 'anulada') {
            await connection.rollback();
            return res.status(409).json({ mensaje: 'La boleta ya se encuentra anulada' });
        }
        if (boleta.estado === 'usada') {
            await connection.rollback();
            return res.status(409).json({ mensaje: 'No se puede anular una boleta usada' });
        }

        await connection.query('UPDATE boletas SET estado = ? WHERE id = ?', ['anulada', id]);
        await connection.query('UPDATE eventos SET aforo_disponible = aforo_disponible + 1 WHERE id = ?', [boleta.evento_id]);

        await connection.commit();
        res.json({ mensaje: 'Boleta anulada correctamente. Cupo devuelto al evento.' });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    listar,
    obtener,
    eliminar,
    validar: validarBoleta,
    anular: anularBoleta,
    validarBoleta,
    anularBoleta
};