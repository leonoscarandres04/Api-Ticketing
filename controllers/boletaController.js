const pool = require('../config/database');

const validarBoleta = async (req, res) => {
    const { codigo } = req.body;
    try {
        const [boletas] = await pool.query('SELECT id, estado FROM boletas WHERE codigo = ?', [codigo]);
        if (boletas.length === 0) return res.status(404).json({ error: 'Boleta no encontrada' });

        const boleta = boletas[0];
        if (boleta.estado === 'USADA') return res.status(400).json({ error: 'Esta boleta ya fue usada' });
        if (boleta.estado === 'ANULADA') return res.status(400).json({ error: 'Esta boleta ha sido anulada' });

        await pool.query('UPDATE boletas SET estado = ? WHERE id = ?', ['USADA', boleta.id]);
        res.json({ mensaje: 'Boleta validada correctamente. Acceso permitido.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al validar la boleta' });
    }
};

const anularBoleta = async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [boletas] = await connection.query('SELECT evento_id, estado FROM boletas WHERE id = ? FOR UPDATE', [id]);
        if (boletas.length === 0) throw new Error('Boleta no encontrada');
        
        const boleta = boletas[0];
        if (boleta.estado === 'ANULADA') throw new Error('La boleta ya se encuentra anulada');
        if (boleta.estado === 'USADA') throw new Error('No se puede anular una boleta usada');

        await connection.query('UPDATE boletas SET estado = ? WHERE id = ?', ['ANULADA', id]);
        await connection.query('UPDATE eventos SET aforo = aforo + 1 WHERE id = ?', [boleta.evento_id]);

        await connection.commit();
        res.json({ mensaje: 'Boleta anulada correctamente. Cupo devuelto al evento.' });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
};

module.exports = { validarBoleta, anularBoleta };