const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

// Si la base de datos esta vacia (por ejemplo, recien creada en internet), crea las tablas
// y los datos de prueba con database/schema.sql. Si ya tiene tablas no toca nada
async function inicializarBaseDeDatos() {
    const [tablas] = await pool.query("SHOW TABLES LIKE 'usuarios'");
    if (tablas.length > 0) return false;

    // Se quitan las lineas que borran y crean la base de datos: se usa la que ya esta configurada en DB_NAME
    const script = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8')
        .split(/\r?\n/)
        .filter((linea) => !/^\s*(DROP DATABASE|CREATE DATABASE|USE)\b/i.test(linea))
        .join('\n');

    const conexion = await pool.getConnection();
    try {
        // El script tiene varias instrucciones seguidas, asi que se ejecutan una por una
        for (const instruccion of script.split(/;\s*(?:\n|$)/)) {
            const sql = instruccion.replace(/^\s*--.*$/gm, '').trim();
            if (sql) await conexion.query(sql);
        }
    } finally {
        conexion.release();
    }
    return true;
}

module.exports = { inicializarBaseDeDatos };
