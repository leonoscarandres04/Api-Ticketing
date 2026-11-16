require('dotenv').config({ quiet: true });

const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { probarConexion } = require('./config/database');
const Compra = require('./models/compraModel');
const rutas = require('./routes');
const { rutaNoEncontrada, manejarErrores } = require('./middlewares/errores');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para que la API entienda y reciba formato JSON
app.use(express.json());

// Si la peticion llega sin cuerpo, Express 5 deja req.body vacio (undefined);
// se deja como objeto vacio para que los controladores respondan 400 y no 500
app.use((req, res, next) => {
    req.body ??= {};
    next();
});

// Pagina web (frontend) en la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Documentacion de la API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas de la API
app.use('/api', rutas);

// Manejo de rutas inexistentes y errores
app.use(rutaNoEncontrada);
app.use(manejarErrores);

// Cada minuto se cancelan las compras que no se pagaron a tiempo y se devuelven sus cupos
setInterval(async () => {
    try {
        const liberados = await Compra.liberarTodasLasVencidas();
        if (liberados > 0) console.log(`Se liberaron ${liberados} cupos de compras vencidas`);
    } catch (error) {
        console.error('No se pudieron liberar las compras vencidas:', error.code || error.message);
    }
}, 60 * 1000);

app.listen(PORT, async () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Pagina web en http://localhost:${PORT}`);
    console.log(`Documentacion en http://localhost:${PORT}/api-docs`);
    try {
        await probarConexion();
        console.log('Conectado a la base de datos MySQL');
    } catch (error) {
        console.error('No se pudo conectar a MySQL:', error.code || error.message, '(revisa que MySQL este encendido y los datos del .env)');
    }
});
