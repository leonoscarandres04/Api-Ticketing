const mysql = require('mysql2/promise');

// Conexion segura (SSL), necesaria en bases de datos en internet como Aiven.
// DB_SSL_CA es el certificado del proveedor; si no se pone, se cifra igual pero sin verificar el certificado
function opcionesSSL() {
    if (process.env.DB_SSL_CA) {
        return { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true };
    }
    if (process.env.DB_SSL === 'true') {
        return { rejectUnauthorized: false };
    }
    return undefined;
}

// Pool de conexiones a MySQL (los datos se leen del archivo .env)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ticketing',
    ssl: opcionesSSL(),
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true
});

// Cada conexion trabaja con la hora de Colombia, aunque el servidor de la base de datos este en otro pais
pool.on('connection', (conexion) => {
    conexion.query(`SET time_zone = '${process.env.DB_ZONA_HORARIA || '-05:00'}'`);
});

// Verifica al arrancar que la base de datos responde
async function probarConexion() {
    const conexion = await pool.getConnection();
    await conexion.ping();
    conexion.release();
}

module.exports = { pool, probarConexion };
