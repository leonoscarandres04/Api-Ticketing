const { pool } = require('../config/database');

// Consultas SQL de la tabla eventos

async function listar() {
    const [filas] = await pool.query('SELECT * FROM eventos ORDER BY fecha');
    return filas;
}

async function obtenerPorId(id) {
    const [filas] = await pool.query('SELECT * FROM eventos WHERE id = ?', [id]);
    return filas[0];
}

// Crea el evento; si es de sillas numeradas tambien crea sus sillas (filas A, B, C... y numeros 1, 2, 3...)
async function crear(evento) {
    const { organizador_id, nombre, descripcion, lugar, fecha, precio, imagen_url } = evento;
    const numerado = evento.tipo === 'numerado';
    const aforo = numerado ? evento.filas * evento.sillas_por_fila : evento.aforo_total;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Al crear el evento todo el aforo esta disponible
        const [resultado] = await connection.query(
            `INSERT INTO eventos (organizador_id, nombre, descripcion, lugar, fecha, aforo_total, aforo_disponible,
                                  precio, imagen_url, tipo, filas, sillas_por_fila)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [organizador_id, nombre, descripcion ?? null, lugar, fecha, aforo, aforo, precio ?? 0, imagen_url || null,
                numerado ? 'numerado' : 'general', numerado ? evento.filas : null, numerado ? evento.sillas_por_fila : null]
        );
        if (numerado) {
            const sillas = [];
            for (let f = 0; f < evento.filas; f++) {
                for (let n = 1; n <= evento.sillas_por_fila; n++) {
                    sillas.push([resultado.insertId, String.fromCharCode(65 + f), n]);
                }
            }
            await connection.query('INSERT INTO sillas (evento_id, fila, numero) VALUES ?', [sillas]);
        }
        await connection.commit();
        return obtenerPorId(resultado.insertId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function actualizar(id, evento) {
    const { nombre, descripcion, lugar, fecha, precio, estado, imagen_url } = evento;
    // TODO: definir como se actualiza aforo_total sin dañar el aforo_disponible ya vendido
    // La imagen se puede quitar mandando imagen_url vacia
    await pool.query(
        `UPDATE eventos
         SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion), lugar = COALESCE(?, lugar),
             fecha = COALESCE(?, fecha), precio = COALESCE(?, precio), estado = COALESCE(?, estado),
             imagen_url = IF(?, ?, imagen_url)
         WHERE id = ?`,
        [nombre, descripcion, lugar, fecha, precio, estado, imagen_url !== undefined, imagen_url || null, id]
    );
    return obtenerPorId(id);
}

async function eliminar(id) {
    const [resultado] = await pool.query('DELETE FROM eventos WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
}

// Sillas de un evento numerado con si estan ocupadas o no
async function listarSillas(eventoId) {
    const [filas] = await pool.query(
        `SELECT id, fila, numero, boleta_id IS NOT NULL AS ocupada
         FROM sillas WHERE evento_id = ? ORDER BY fila, numero`,
        [eventoId]
    );
    return filas.map((s) => ({ ...s, ocupada: Boolean(s.ocupada) }));
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar, listarSillas };
