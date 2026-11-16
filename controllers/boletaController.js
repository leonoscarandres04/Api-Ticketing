const { pool } = require('../config/database');
const Boleta = require('../models/boletaModel');

// El comprador solo puede ver sus boletas y el organizador solo las de sus eventos
function puedeVer(usuario, boleta) {
    if (usuario.rol === 'comprador') return boleta.comprador_id === usuario.id;
    return boleta.organizador_id === usuario.id;
}

// GET /api/boletas
const listar = async (req, res) => {
    const filtros = { eventoId: req.query.evento_id };
    if (req.usuario.rol === 'comprador') {
        filtros.compradorId = req.usuario.id;
    } else {
        filtros.organizadorId = req.usuario.id;
    }
    const boletas = await Boleta.listar(filtros);
    res.json(boletas);
};

// GET /api/boletas/:id
const obtener = async (req, res) => {
    const boleta = await Boleta.obtenerPorId(req.params.id);
    if (!boleta || !puedeVer(req.usuario, boleta)) {
        return res.status(404).json({ mensaje: 'Boleta no encontrada' });
    }
    res.json(boleta);
};

// DELETE /api/boletas/:id
const eliminar = async (req, res) => {
    const boleta = await Boleta.obtenerPorId(req.params.id);
    if (!boleta) {
        return res.status(404).json({ mensaje: 'Boleta no encontrada' });
    }
    if (boleta.organizador_id !== req.usuario.id) {
        return res.status(403).json({ mensaje: 'Solo el organizador del evento puede eliminar sus boletas' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Se bloquea primero el evento y luego la boleta, en el mismo orden que la compra
        await connection.query('SELECT id FROM eventos WHERE id = ? FOR UPDATE', [boleta.evento_id]);
        const [filas] = await connection.query('SELECT estado FROM boletas WHERE id = ? FOR UPDATE', [req.params.id]);
        if (filas.length === 0) {
            await connection.rollback();
            return res.status(404).json({ mensaje: 'Boleta no encontrada' });
        }

        await connection.query('DELETE FROM boletas WHERE id = ?', [req.params.id]);
        // Si la boleta seguia valida, su cupo vuelve al evento
        if (filas[0].estado === 'valida') {
            await connection.query('UPDATE eventos SET aforo_disponible = aforo_disponible + 1 WHERE id = ?', [boleta.evento_id]);
        }

        await connection.commit();
        res.status(204).send();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// POST /api/boletas/validar
const validarBoleta = async (req, res) => {
    const codigo = req.body.codigo || req.params.codigo;
    if (!codigo) {
        return res.status(400).json({ mensaje: 'El codigo de la boleta es obligatorio' });
    }

    const encontrada = await Boleta.obtenerPorCodigo(codigo);
    if (!encontrada) {
        return res.status(404).json({ mensaje: 'Boleta no encontrada' });
    }
    if (encontrada.organizador_id !== req.usuario.id) {
        return res.status(403).json({ mensaje: 'Esta boleta es de un evento de otro organizador' });
    }

    const connection = await pool.getConnection();
    let marcada;
    try {
        await connection.beginTransaction();
        // Se bloquea primero el evento, en el mismo orden que la compra y la anulacion
        await connection.query('SELECT id FROM eventos WHERE id = ? FOR UPDATE', [encontrada.evento_id]);
        // Se marca como usada en un solo paso y solo si sigue 'valida', la compra esta pagada
        // y el evento esta activo. Asi dos validaciones al mismo tiempo no pueden dejar
        // entrar con la misma boleta
        const [resultado] = await connection.query(
            `UPDATE boletas b
             JOIN compras c ON c.id = b.compra_id
             JOIN eventos e ON e.id = b.evento_id
             SET b.estado = 'usada', b.usada_en = NOW()
             WHERE b.id = ? AND b.estado = 'valida' AND c.estado = 'pagada' AND e.estado = 'activo'`,
            [encontrada.id]
        );
        await connection.commit();
        marcada = resultado.affectedRows === 1;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    if (marcada) {
        return res.json({ mensaje: 'Boleta validada correctamente. Acceso permitido.' });
    }

    // No se marco: se busca el motivo con los datos actualizados
    const boleta = await Boleta.obtenerPorCodigo(codigo);
    if (boleta.estado === 'anulada') {
        return res.status(409).json({ mensaje: 'Esta boleta ha sido anulada' });
    }
    if (boleta.estado === 'usada') {
        return res.status(409).json({ mensaje: 'Esta boleta ya fue usada' });
    }
    if (boleta.estado_compra !== 'pagada') {
        return res.status(409).json({ mensaje: 'Esta boleta no ha sido pagada' });
    }
    res.status(409).json({ mensaje: `El evento esta ${boleta.estado_evento}` });
};

// PATCH /api/boletas/:id/anular
const anularBoleta = async (req, res) => {
    const { id } = req.params;
    const datos = await Boleta.obtenerPorId(id);
    if (!datos) {
        return res.status(404).json({ mensaje: 'Boleta no encontrada' });
    }
    if (datos.organizador_id !== req.usuario.id) {
        return res.status(403).json({ mensaje: 'Solo el organizador del evento puede anular sus boletas' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Se bloquea primero el evento y luego la boleta, en el mismo orden que la compra
        await connection.query('SELECT id FROM eventos WHERE id = ? FOR UPDATE', [datos.evento_id]);
        const [boletas] = await connection.query('SELECT evento_id, estado FROM boletas WHERE id = ? FOR UPDATE', [id]);
        if (boletas.length === 0) {
            await connection.rollback();
            return res.status(404).json({ mensaje: 'Boleta no encontrada' });
        }

        const boleta = boletas[0];
        if (boleta.estado === 'anulada') {
            await connection.rollback();
            return res.status(409).json({ mensaje: 'La boleta ya se encuentra anulada' });
        }
        if (boleta.estado === 'usada') {
            await connection.rollback();
            return res.status(409).json({ mensaje: 'No se puede anular una boleta usada' });
        }

        await connection.query('UPDATE boletas SET estado = ? WHERE id = ?', ['anulada', id]);
        await connection.query('UPDATE eventos SET aforo_disponible = aforo_disponible + 1 WHERE id = ?', [boleta.evento_id]);

        await connection.commit();
        res.json({ mensaje: 'Boleta anulada correctamente. Cupo devuelto al evento.' });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    listar,
    obtener,
    eliminar,
    validar: validarBoleta,
    anular: anularBoleta,
    validarBoleta,
    anularBoleta
};
