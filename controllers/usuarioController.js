const Usuario = require('../models/usuarioModel');

// GET /api/usuarios
async function listar(req, res) {
    const usuarios = await Usuario.listar();
    res.json(usuarios);
}

// GET /api/usuarios/:id
async function obtener(req, res) {
    const usuario = await Usuario.obtenerPorId(req.params.id);
    if (!usuario) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    res.json(usuario);
}

module.exports = { listar, obtener };
