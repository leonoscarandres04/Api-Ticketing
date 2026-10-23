// Autenticacion con JWT (pendiente)

// POST /api/auth/registro
async function registro(req, res) {
    // TODO: validar datos, encriptar la password con bcrypt y guardar el usuario con su rol
    res.status(501).json({ mensaje: 'Pendiente: registro de usuarios' });
}

// POST /api/auth/login
async function login(req, res) {
    // TODO: buscar por email, comparar la password y devolver un token JWT con id y rol
    res.status(501).json({ mensaje: 'Pendiente: login con JWT' });
}

module.exports = { registro, login };
