// Ruta que no existe
function rutaNoEncontrada(req, res) {
    res.status(404).json({ mensaje: `No existe la ruta ${req.method} ${req.originalUrl}` });
}

// Manejo central de errores (Express 5 envia aqui los errores de los controladores async)
function manejarErrores(err, req, res, next) {
    console.error(err);

    // JSON mal formado en el body
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ mensaje: 'El cuerpo de la peticion no es un JSON valido' });
    }
    // Errores comunes de MySQL
    if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({ mensaje: 'La base de datos no esta disponible' });
    }
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ mensaje: 'El registro ya existe' });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ mensaje: 'Hace referencia a un registro que no existe' });
    }
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({ mensaje: 'No se puede eliminar porque tiene registros asociados' });
    }
    if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
        return res.status(400).json({ mensaje: 'Los datos no cumplen las reglas de la base de datos' });
    }

    res.status(500).json({ mensaje: 'Error interno del servidor' });
}

module.exports = { rutaNoEncontrada, manejarErrores };
