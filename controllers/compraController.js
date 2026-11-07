const pool = require('../config/database'); 
const { v4: uuidv4 } = require('uuid');

const crearCompra = async (req, res) => {
    const { evento_id, usuario_id, cantidad_entradas } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [eventos] = await connection.query('SELECT aforo FROM eventos WHERE id = ? FOR UPDATE', [evento_id]);
        if (eventos.length === 0) throw new Error('Evento no encontrado');
        
        const evento = eventos[0];
        if (evento.aforo < cantidad_entradas) throw new Error('Aforo insuficiente para esta compra');

        await connection.query('UPDATE eventos SET aforo = aforo - ? WHERE id = ?', [cantidad_entradas, evento_id]);

        const [resultCompra] = await connection.query(
            'INSERT INTO compras (evento_id, usuario_id, cantidad, estado) VALUES (?, ?, ?, ?)',
            [evento_id, usuario_id, cantidad_entradas, 'PENDIENTE']
        );
        const compra_id = resultCompra.insertId;

        const boletas = [];
        for (let i = 0; i < cantidad_entradas; i++) {
            const codigoUnico = uuidv4().substring(0, 8).toUpperCase();
            await connection.query(
                'INSERT INTO boletas (compra_id, evento_id, codigo, estado) VALUES (?, ?, ?, ?)',
                [compra_id, evento_id, codigoUnico, 'VÁLIDA']
            );
            boletas.push(codigoUnico);
        }

        await connection.commit();
        res.status(201).json({ mensaje: 'Compra exitosa', compra_id, boletas_generadas: boletas });

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
        const [result] = await pool.query(
            'UPDATE compras SET estado = ? WHERE id = ? AND estado = ?',
            ['PAGADO', id, 'PENDIENTE']
        );
        if (result.affectedRows === 0) return res.status(400).json({ error: 'Compra no encontrada o ya pagada' });
        res.json({ mensaje: 'Pago simulado procesado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar el pago' });
    }
};

module.exports = { crearCompra, pagarCompra };