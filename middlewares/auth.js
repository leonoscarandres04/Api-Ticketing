const jwt = require('jsonwebtoken');

// Verifica el token JWT del header Authorization: Bearer <token>
function verificarToken(req, res, next) {
    const encabezado = req.headers.authorization;
    if (!encabezado || !encabezado.startsWith('Bearer ')) {
        return res.status(401).json({ mensaje: 'Token requerido' });
    }

    const token = encabezado.split(' ')[1];
    try {
        const datos = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = { id: datos.id, rol: datos.rol };
        next();
    } catch (error) {
        return res.status(401).json({ mensaje: 'Token invalido o expirado' });
    }
}

// Uso: permitirRoles('organizador') o permitirRoles('organizador', 'comprador')
function permitirRoles(...roles) {
    return (req, res, next) => {
        if (!req.usuario || !roles.includes(req.usuario.rol)) {
            return res.status(403).json({ mensaje: 'No tienes permiso para esta accion' });
        }
        next();
    };
}

module.exports = { verificarToken, permitirRoles };