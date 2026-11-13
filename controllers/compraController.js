const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
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
const crearCompra = async (req, res) => {
    const evento_id = req.body.evento_id;
    const comprador_id = req.usuario?.id || req.body.comprador_id || req.body.usuario_id;
    const cantidadRaw = req.body.cantidad !== undefined ? req.body.cantidad : req.body.cantidad_entradas;

    if (!evento_id || !comprador_id || cantidadRaw === undefined) {
        return res.status(400).json({ mensaje: 'evento_id, comprador_id y cantidad son obligatorios' });
    }

    const cantidad = Number(cantidadRaw);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
        return res.status(400).json({ mensaje: 'La cantidad debe ser un numero entero mayor a 0' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Bloquear evento y revisar existencia, estado y aforo_disponible
        const [eventos] = await connection.query(
            'SELECT aforo_disponible, precio, estado FROM eventos WHERE id = ? FOR UPDATE',
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

        if (evento.aforo_disponible < cantidad) {
            await connection.rollback();
            return res.status(409).json({ mensaje: 'Aforo insuficiente para esta compra' });
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

        // 5. Generar boletas
        const boletas = [];
        for (let i = 0; i < cantidad; i++) {
            const codigoUnico = uuidv4().substring(0, 8).toUpperCase();
            await connection.query(
                'INSERT INTO boletas (compra_id, evento_id, codigo, estado) VALUES (?, ?, ?, ?)',
                [compra_id, evento_id, codigoUnico, 'valida']
            );
            boletas.push(codigoUnico);
        }

        await connection.commit();
        res.status(201).json({
            mensaje: 'Compra exitosa',
            compra_id,
            total: totalCompra,
            boletas_generadas: boletas
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

    if (compra.estado === 'pagada') {
        return res.status(409).json({ mensaje: 'Esta compra ya fue pagada' });
    }
    if (compra.estado === 'cancelada') {
        return res.status(409).json({ mensaje: 'No se puede pagar una compra cancelada' });
    }

    await pool.query(
        'UPDATE compras SET estado = ? WHERE id = ?',
        ['pagada', id]
    );

    res.json({ mensaje: 'Pago simulado procesado correctamente' });
};

module.exports = {
    listar,
    obtener,
    crear: crearCompra,
    pagar: pagarCompra,
    crearCompra,
    pagarCompra
};