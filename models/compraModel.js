const { pool } = require('../config/database');

// Consultas SQL de la tabla compras

async function listar() {
    const [filas] = await pool.query('SELECT * FROM compras ORDER BY creado_en DESC');
    return filas;
}

async function obtenerPorId(id) {
    const [filas] = await pool.query('SELECT * FROM compras WHERE id = ?', [id]);
    return filas[0];
}

async function listarPorComprador(compradorId) {
    const [filas] = await pool.query('SELECT * FROM compras WHERE comprador_id = ? ORDER BY creado_en DESC', [compradorId]);
    return filas;
}

// Minutos que tiene el comprador para pagar antes de que la compra venza
const MINUTOS_PARA_PAGAR = 15;

// Cancela las compras pendientes vencidas de un evento, anula sus boletas y devuelve los cupos.
// Se llama dentro de una transaccion que ya bloqueo el evento (SELECT ... FOR UPDATE).
// Devuelve cuantos cupos se liberaron
async function liberarVencidas(connection, eventoId) {
    const [vencidas] = await connection.query(
        `SELECT id FROM compras
         WHERE evento_id = ? AND estado = 'pendiente' AND creado_en < NOW() - INTERVAL ${MINUTOS_PARA_PAGAR} MINUTE
         FOR UPDATE`,
        [eventoId]
    );
    if (vencidas.length === 0) return 0;

    const ids = vencidas.map((c) => c.id);
    // Solo vuelven al aforo las boletas que seguian validas (una anulada ya devolvio su cupo)
    const [anuladas] = await connection.query(
        "UPDATE boletas SET estado = 'anulada' WHERE compra_id IN (?) AND estado = 'valida'",
        [ids]
    );
    await connection.query("UPDATE compras SET estado = 'cancelada' WHERE id IN (?)", [ids]);
    await connection.query(
        'UPDATE eventos SET aforo_disponible = aforo_disponible + ? WHERE id = ?',
        [anuladas.affectedRows, eventoId]
    );
    return anuladas.affectedRows;
}

// Libera las compras vencidas de un evento en su propia transaccion
async function liberarVencidasDeEvento(eventoId) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('SELECT id FROM eventos WHERE id = ? FOR UPDATE', [eventoId]);
        const liberados = await liberarVencidas(connection, eventoId);
        await connection.commit();
        return liberados;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Revisa todos los eventos que tengan compras vencidas (se llama cada minuto desde index.js)
async function liberarTodasLasVencidas() {
    const [eventos] = await pool.query(
        `SELECT DISTINCT evento_id FROM compras
         WHERE estado = 'pendiente' AND creado_en < NOW() - INTERVAL ${MINUTOS_PARA_PAGAR} MINUTE`
    );
    let liberados = 0;
    for (const { evento_id } of eventos) {
        liberados += await liberarVencidasDeEvento(evento_id);
    }
    return liberados;
}

module.exports = {
    MINUTOS_PARA_PAGAR,
    listar,
    obtenerPorId,
    listarPorComprador,
    liberarVencidas,
    liberarVencidasDeEvento,
    liberarTodasLasVencidas
};
