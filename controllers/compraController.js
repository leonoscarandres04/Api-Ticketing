const { pool } = require('../config/database'); 
const { v4: uuidv4 } = require('uuid');

const crearCompra = async (req, res) => {
    const { evento_id, usuario_id, cantidad_entradas } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Bloquear evento y revisar aforo_disponible
        const [eventos] = await connection.query('SELECT aforo_disponible, precio FROM eventos WHERE id = ? FOR UPDATE', [evento_id]);
        if (eventos.length === 0) throw new Error('Evento no encontrado');
        
        const evento = eventos[0];
        if (evento.aforo_disponible < cantidad_entradas) throw new Error('Aforo insuficiente para esta compra');

        // 2. Calcular total a pagar
        const totalCompra = evento.precio * cantidad_entradas;

        // 3. Descontar aforo_disponible
        await connection.query('UPDATE eventos SET aforo_disponible = aforo_disponible - ? WHERE id = ?', [cantidad_entradas, evento_id]);

        // 4. Registrar compra (usa comprador_id, total y estado 'pendiente')
        const [resultCompra] = await connection.query(
            'INSERT INTO compras (evento_id, comprador_id, cantidad, total, estado) VALUES (?, ?, ?, ?, ?)',
            [evento_id, usuario_id, cantidad_entradas, totalCompra, 'pendiente']
        );
        const compra_id = resultCompra.insertId;

        // 5. Generar boletas (estado 'valida')
        const boletas = [];
        for (let i = 0; i < cantidad_entradas; i++) {
            const codigoUnico = uuidv4().substring(0, 8).toUpperCase();
            await connection.query(
                'INSERT INTO boletas (compra_id, evento_id, codigo, estado) VALUES (?, ?, ?, ?)',
                [compra_id, evento_id, codigoUnico, 'valida']
            );
            boletas.push(codigoUnico);
        }

        await connection.commit();
        res.status(201).json({ mensaje: 'Compra exitosa', compra_id, total: totalCompra, boletas_generadas: boletas });

    } catch (error) {
        await connection.rollback();
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
};

const pagarCompra = async (req, res) => {
    const { id } = req.params;
    try {
        // Pasa de 'pendiente' a 'pagada'
        const [result] = await pool.query(
            'UPDATE compras SET estado = ? WHERE id = ? AND estado = ?',
            ['pagada', id, 'pendiente']
        );
        if (result.affectedRows === 0) return res.status(400).json({ error: 'Compra no encontrada o ya pagada' });
        res.json({ mensaje: 'Pago simulado procesado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar el pago' });
    }
};

module.exports = { crearCompra, pagarCompra };