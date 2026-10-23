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

// TODO (flujo de compra): crear la compra dentro de una transaccion que
// 1. bloquee el evento (SELECT ... FOR UPDATE) y revise el aforo_disponible
// 2. descuente la cantidad del aforo para evitar la sobreventa
// 3. registre la compra y genere un boleto con codigo unico por cada entrada
// 4. simule el pago y cambie el estado a 'pagada'

module.exports = { listar, obtenerPorId, listarPorComprador };
