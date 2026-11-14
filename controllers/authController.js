// Autenticacion con JWT
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuarioModel');

const ROLES = ['organizador', 'comprador'];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/registro
async function registro(req, res) {
    const { email, password, rol = 'comprador' } = req.body || {};
    let { nombre } = req.body || {};

    // nombre, email y password deben ser texto (si llega un numero daria error 500)
    if (typeof nombre !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ mensaje: 'nombre, email y password son obligatorios y deben ser texto' });
    }

    nombre = nombre.trim();
    if (nombre.length === 0) {
        return res.status(400).json({ mensaje: 'El nombre no puede estar vacio' });
    }
    if (nombre.length > 100) {
        return res.status(400).json({ mensaje: 'El nombre no puede tener mas de 100 caracteres' });
    }
    if (email.length > 150 || !EMAIL_VALIDO.test(email)) {
        return res.status(400).json({ mensaje: 'El email no tiene un formato valido' });
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
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        return res.status(400).json({ mensaje: 'email y password son obligatorios y deben ser texto' });
    }

    const usuario = await Usuario.obtenerPorEmail(email);
    // Mismo mensaje si el email no existe o la password es incorrecta
    if (!usuario) {
        return res.status(401).json({ mensaje: 'Credenciales invalidas' });
    }

    const coincide = await bcrypt.compare(password, usuario.password);
    if (!coincide) {
        return res.status(401).json({ mensaje: 'Credenciales invalidas' });
    }

    const token = jwt.sign(
        { id: usuario.id, rol: usuario.rol },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRA || '2h' }
    );

    res.json({
        token,
        usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
}

module.exports = { registro, login };