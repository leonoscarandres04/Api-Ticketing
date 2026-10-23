// Middlewares de autenticacion y roles (pendiente)
// Por ahora dejan pasar todas las peticiones para poder probar los CRUD.

// Verifica el token JWT del header Authorization: Bearer <token>
function verificarToken(req, res, next) {
    // TODO: validar el token con jsonwebtoken y guardar el usuario en req.usuario
    next();
}

// Uso: permitirRoles('organizador') o permitirRoles('organizador', 'comprador')
function permitirRoles(...roles) {
    return (req, res, next) => {
        // TODO: responder 403 si req.usuario.rol no esta en roles
        next();
    };
}

module.exports = { verificarToken, permitirRoles };
