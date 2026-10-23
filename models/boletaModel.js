const { pool } = require('../config/database');

// Consultas SQL de la tabla boletas

async function listar(eventoId) {
    if (eventoId) {
        const [filas] = await pool.query('SELECT * FROM boletas WHERE evento_id = ?', [eventoId]);
        return filas;
    }
    const [filas] = await pool.query('SELECT * FROM boletas');
    return filas;
}

async function obtenerPorId(id) {
    const [filas] = await pool.query('SELECT * FROM boletas WHERE id = ?', [id]);
    return filas[0];
}

async function obtenerPorCodigo(codigo) {
    const [filas] = await pool.query('SELECT * FROM boletas WHERE codigo = ?', [codigo]);
    return filas[0];
}

async function actualizarEstado(id, estado) {
    await pool.query('UPDATE boletas SET estado = ? WHERE id = ?', [estado, id]);
    return obtenerPorId(id);
}

async function eliminar(id) {
    const [resultado] = await pool.query('DELETE FROM boletas WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
}

// Las boletas se crean dentro del flujo de compra (ver compraModel)

module.exports = { listar, obtenerPorId, obtenerPorCodigo, actualizarEstado, eliminar };
