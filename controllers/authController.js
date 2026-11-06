// Autenticacion con JWT
const bcrypt = require('bcrypt');
const Usuario = require('../models/usuarioModel');

const ROLES = ['organizador', 'comprador'];

// POST /api/auth/registro
async function registro(req, res) {
    const { nombre, email, password, rol = 'comprador' } = req.body;
    if (!nombre || !email || !password) {
        return res.status(400).json({ mensaje: 'nombre, email y password son obligatorios' });
    }
    if (password.length < 6) {
        return res.status(400).json({ mensaje: 'La password debe tener minimo 6 caracteres' });
    }
    if (!ROLES.includes(rol)) {
        return res.status(400).json({ mensaje: 'rol debe ser organizador o comprador' });
    }

    const existe = await Usuario.obtenerPorEmail(email);
    if (existe) {
        return res.status(409).json({ mensaje: 'Ya existe un usuario con ese email' });
    }

    const passwordEncriptada = await bcrypt.hash(password, 10);
    const usuario = await Usuario.crear({ nombre, email, password: passwordEncriptada, rol });
    res.status(201).json(usuario);
}

// POST /api/auth/login
async function login(req, res) {
    // TODO: buscar por email, comparar la password y devolver un token JWT con id y rol
    res.status(501).json({ mensaje: 'Pendiente: login con JWT' });
}

module.exports = { registro, login };