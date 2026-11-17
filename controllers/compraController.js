const { pool } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');
const Compra = require('../models/compraModel');

// GET /api/compras
async function listar(req, res) {
    // El organizador ve todas; el comprador solo las suyas
    const compras = req.usuario.rol === 'comprador'
        ? await Compra.listarPorComprador(req.usuario.id)
        : await Compra.listar();
    res.json(compras);
};

// GET /api/compras/:id
const obtener = async (req, res) => {
    const compra = await Compra.obtenerPorId(req.params.id);
    if (!compra) {
        return res.status(404).json({ mensaje: 'Compra no encontrada' });
    }
    if (req.usuario.rol === 'comprador' && compra.comprador_id !== req.usuario.id) {
        return res.status(403).json({ mensaje: 'No puedes ver compras de otro usuario' });
    }
    res.json(compra);
};

// POST /api/compras
// Entrada general: { evento_id, cantidad }. Sillas numeradas: { evento_id, sillas: [id, id, ...] }
const crearCompra = async (req, res) => {
    const evento_id = req.body.evento_id;
    const comprador_id = req.usuario?.id || req.body.comprador_id || req.body.usuario_id;
    const sillasPedidas = req.body.sillas;
    const cantidadRaw = sillasPedidas !== undefined
        ? (Array.isArray(sillasPedidas) ? sillasPedidas.length : undefined)
        : (req.body.cantidad !== undefined ? req.body.cantidad : req.body.cantidad_entradas);

    if (sillasPedidas !== undefined && (!Array.isArray(sillasPedidas) || !sillasPedidas.every(Number.isInteger))) {
        return res.status(400).json({ mensaje: 'sillas debe ser una lista con los id de las sillas' });
    }
    if (sillasPedidas !== undefined && new Set(sillasPedidas).size !== sillasPedidas.length) {
        return res.status(400).json({ mensaje: 'No puedes escoger la misma silla dos veces' });
    }

    if (!evento_id || !comprador_id || cantidadRaw === undefined) {
        return res.status(400).json({ mensaje: 'evento_id, comprador_id y cantidad son obligatorios' });
    }

    const cantidad = Number(cantidadRaw);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
        return res.status(400).json({ mensaje: 'La cantidad debe ser un numero entero mayor a 0' });
    }
    if (cantidad > Compra.MAX_BOLETAS_POR_PERSONA) {
        return res.status(409).json({ mensaje: `Solo puedes tener ${Compra.MAX_BOLETAS_POR_PERSONA} boletas por persona en cada evento` });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Bloquear evento y revisar existencia, estado, fecha y aforo_disponible.
        //    Mientras el evento este bloqueado nadie mas puede comprar en el, asi que el aforo,
        //    el limite por persona y las sillas no se pueden cruzar con otra compra
        const [eventos] = await connection.query(
            'SELECT aforo_disponible, precio, estado, tipo, fecha <= NOW() AS ya_paso FROM eventos WHERE id = ? FOR UPDATE',
            [evento_id]
        );

        if (eventos.length === 0) {
            await connection.rollback();
            return res.status(404).json({ mensaje: 'Evento no encontrado' });
        }

        const evento = eventos[0];

        if (evento.estado !== 'activo') {
            await connection.rollback();
            return res.status(409).json({ mensaje: `No se pueden realizar compras para un evento ${evento.estado}` });
        }

        if (evento.ya_paso) {
            await connection.rollback();
            return res.status(409).json({ mensaje: 'El evento ya paso, no se pueden comprar boletas' });
        }

        const numerado = evento.tipo === 'numerado';
        if (numerado && sillasPedidas === undefined) {
            await connection.rollback();
            return res.status(400).json({ mensaje: 'Este evento tiene sillas numeradas: escoge tus sillas' });
        }
        if (!numerado && sillasPedidas !== undefined) {
            await connection.rollback();
            return res.status(400).json({ mensaje: 'Este evento es de entrada general, no tiene sillas' });
        }

        // Antes de revisar el aforo se liberan los cupos de las compras que no se pagaron a tiempo
        evento.aforo_disponible += await Compra.liberarVencidas(connection, evento_id);

        // Limite de boletas por persona en el evento (sin contar anuladas ni vencidas)
        const [[{ yaTiene }]] = await connection.query(
            `SELECT COUNT(*) AS yaTiene FROM boletas b JOIN compras c ON c.id = b.compra_id
             WHERE b.evento_id = ? AND c.comprador_id = ? AND b.estado IN ('valida', 'usada')`,
            [evento_id, comprador_id]
        );
        if (yaTiene + cantidad > Compra.MAX_BOLETAS_POR_PERSONA) {
            await connection.rollback();
            return res.status(409).json({
                mensaje: `Solo puedes tener ${Compra.MAX_BOLETAS_POR_PERSONA} boletas por persona en cada evento (ya tienes ${yaTiene})`
            });
        }

        if (evento.aforo_disponible < cantidad) {
            await connection.rollback();
            return res.status(409).json({ mensaje: 'Aforo insuficiente para esta compra' });
        }

        // Sillas numeradas: deben ser de este evento y estar libres
        let sillas = [];
        if (numerado) {
            [sillas] = await connection.query(
                'SELECT id, fila, numero, boleta_id FROM sillas WHERE evento_id = ? AND id IN (?) ORDER BY fila, numero FOR UPDATE',
                [evento_id, sillasPedidas]
            );
            if (sillas.length !== sillasPedidas.length) {
                await connection.rollback();
                return res.status(400).json({ mensaje: 'Alguna de las sillas no existe en este evento' });
            }
            const ocupadas = sillas.filter((s) => s.boleta_id !== null).map((s) => `${s.fila}${s.numero}`);
            if (ocupadas.length) {
                await connection.rollback();
                return res.status(409).json({ mensaje: `Estas sillas ya estan ocupadas: ${ocupadas.join(', ')}` });
            }
        }

        // 2. Calcular total a pagar
        const totalCompra = Number(evento.precio) * cantidad;

        // 3. Descontar aforo_disponible
        await connection.query(
            'UPDATE eventos SET aforo_disponible = aforo_disponible - ? WHERE id = ?',
            [cantidad, evento_id]
        );

        // 4. Registrar compra
        const [resultCompra] = await connection.query(
            'INSERT INTO compras (evento_id, comprador_id, cantidad, total, estado) VALUES (?, ?, ?, ?, ?)',
            [evento_id, comprador_id, cantidad, totalCompra, 'pendiente']
        );
        const compra_id = resultCompra.insertId;

        // 5. Generar boletas (y en eventos numerados, ocupar la silla con cada boleta)
        const boletas = [];
        for (let i = 0; i < cantidad; i++) {
            const codigoUnico = uuidv4().substring(0, 8).toUpperCase();
            const [resultBoleta] = await connection.query(
                'INSERT INTO boletas (compra_id, evento_id, codigo, estado) VALUES (?, ?, ?, ?)',
                [compra_id, evento_id, codigoUnico, 'valida']
            );
            if (numerado) {
                await connection.query('UPDATE sillas SET boleta_id = ? WHERE id = ?', [resultBoleta.insertId, sillas[i].id]);
            }
            boletas.push(codigoUnico);
        }

        await connection.commit();
        res.status(201).json({
            mensaje: 'Compra exitosa',
            compra_id,
            total: totalCompra,
            boletas_generadas: boletas,
            ...(numerado && { sillas: sillas.map((s) => `${s.fila}${s.numero}`) })
        });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// POST /api/compras/:id/pagar
const pagarCompra = async (req, res) => {
    const { id } = req.params;

    const compra = await Compra.obtenerPorId(id);
    if (!compra) {
        return res.status(404).json({ mensaje: 'Compra no encontrada' });
    }

    // Validar que un comprador no pague la compra de otro
    const compradorSolicitante = req.usuario?.id || req.body?.comprador_id || req.body?.usuario_id;
    if (req.usuario && req.usuario.rol === 'comprador' && Number(compra.comprador_id) !== Number(req.usuario.id)) {
        return res.status(403).json({ mensaje: 'No tienes permiso para pagar la compra de otro comprador' });
    }
    if (!req.usuario && compradorSolicitante && Number(compra.comprador_id) !== Number(compradorSolicitante)) {
        return res.status(403).json({ mensaje: 'No tienes permiso para pagar la compra de otro comprador' });
    }

    // Se paga en un solo paso y solo si sigue pendiente y no se ha vencido, asi varios
    // pagos al mismo tiempo de la misma compra no pueden pasar todos
    const [resultado] = await pool.query(
        `UPDATE compras SET estado = 'pagada'
         WHERE id = ? AND estado = 'pendiente' AND creado_en >= NOW() - INTERVAL ${Compra.MINUTOS_PARA_PAGAR} MINUTE`,
        [id]
    );
    if (resultado.affectedRows === 1) {
        return res.json({ mensaje: 'Pago simulado procesado correctamente' });
    }

    // No se pago: se revisa por que
    const actual = await Compra.obtenerPorId(id);
    if (actual.estado === 'pagada') {
        return res.status(409).json({ mensaje: 'Esta compra ya fue pagada' });
    }
    if (actual.estado === 'pendiente') {
        // Sigue pendiente pero ya se vencio: se cancela y se devuelven los cupos
        await Compra.liberarVencidasDeEvento(actual.evento_id);
    }
    res.status(409).json({ mensaje: `La compra vencio: tenias ${Compra.MINUTOS_PARA_PAGAR} minutos para pagarla` });
};

module.exports = {
    listar,
    obtener,
    crear: crearCompra,
    pagar: pagarCompra,
    crearCompra,
    pagarCompra
};