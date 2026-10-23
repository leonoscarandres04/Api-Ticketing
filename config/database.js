const mysql = require('mysql2/promise');

// Pool de conexiones a MySQL (los datos se leen del archivo .env)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ticketing',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true
});

// Verifica al arrancar que la base de datos responde
async function probarConexion() {
    const conexion = await pool.getConnection();
    await conexion.ping();
    conexion.release();
}

module.exports = { pool, probarConexion };
