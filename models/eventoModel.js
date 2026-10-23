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

async function crear(evento) {
    const { organizador_id, nombre, descripcion, lugar, fecha, aforo_total, precio } = evento;
    // Al crear el evento todo el aforo esta disponible
    const [resultado] = await pool.query(
        `INSERT INTO eventos (organizador_id, nombre, descripcion, lugar, fecha, aforo_total, aforo_disponible, precio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [organizador_id, nombre, descripcion ?? null, lugar, fecha, aforo_total, aforo_total, precio ?? 0]
    );
    return obtenerPorId(resultado.insertId);
}

async function actualizar(id, evento) {
    const { nombre, descripcion, lugar, fecha, precio, estado } = evento;
    // TODO: definir como se actualiza aforo_total sin dañar el aforo_disponible ya vendido
    await pool.query(
        `UPDATE eventos
         SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion), lugar = COALESCE(?, lugar),
             fecha = COALESCE(?, fecha), precio = COALESCE(?, precio), estado = COALESCE(?, estado)
         WHERE id = ?`,
        [nombre, descripcion, lugar, fecha, precio, estado, id]
    );
    return obtenerPorId(id);
}

async function eliminar(id) {
    const [resultado] = await pool.query('DELETE FROM eventos WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
