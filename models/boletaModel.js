const { pool } = require('../config/database');

// Consultas SQL de la tabla boletas

// Boleta junto con su comprador, su organizador y el estado de la compra y del evento
const CON_DUENOS = `
    SELECT b.*, c.comprador_id, c.estado AS estado_compra, e.organizador_id, e.estado AS estado_evento
    FROM boletas b
    JOIN compras c ON c.id = b.compra_id
    JOIN eventos e ON e.id = b.evento_id`;

// El comprador solo ve sus boletas y el organizador solo las de sus eventos
async function listar({ eventoId, compradorId, organizadorId } = {}) {
    let sql = `${CON_DUENOS} WHERE 1 = 1`;
    const parametros = [];
    if (eventoId) {
        sql += ' AND b.evento_id = ?';
        parametros.push(eventoId);
    }
    if (compradorId) {
        sql += ' AND c.comprador_id = ?';
        parametros.push(compradorId);
    }
    if (organizadorId) {
        sql += ' AND e.organizador_id = ?';
        parametros.push(organizadorId);
    }
    const [filas] = await pool.query(sql, parametros);
    return filas;
}

async function obtenerPorId(id) {
    const [filas] = await pool.query(`${CON_DUENOS} WHERE b.id = ?`, [id]);
    return filas[0];
}

async function obtenerPorCodigo(codigo) {
    const [filas] = await pool.query(`${CON_DUENOS} WHERE b.codigo = ?`, [codigo]);
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
