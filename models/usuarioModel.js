const { pool } = require('../config/database');

// Consultas SQL de la tabla usuarios (nunca se devuelve la password)
const CAMPOS_PUBLICOS = 'id, nombre, email, rol, creado_en';

async function listar() {
    const [filas] = await pool.query(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios`);
    return filas;
}

async function obtenerPorId(id) {
    const [filas] = await pool.query(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = ?`, [id]);
    return filas[0];
}

// Para el login: aqui si se trae la password encriptada para compararla
async function obtenerPorEmail(email) {
    const [filas] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    return filas[0];
}

// TODO (autenticacion): crear(usuario) recibiendo la password ya encriptada con bcrypt

module.exports = { listar, obtenerPorId, obtenerPorEmail };
