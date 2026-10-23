require('dotenv').config({ quiet: true });

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { probarConexion } = require('./config/database');
const rutas = require('./routes');
const { rutaNoEncontrada, manejarErrores } = require('./middlewares/errores');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para que la API entienda y reciba formato JSON
app.use(express.json());

// Documentacion de la API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas de la API
app.use('/api', rutas);

// Manejo de rutas inexistentes y errores
app.use(rutaNoEncontrada);
app.use(manejarErrores);

app.listen(PORT, async () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Documentacion en http://localhost:${PORT}/api-docs`);
    try {
        await probarConexion();
        console.log('Conectado a la base de datos MySQL');
    } catch (error) {
        console.error('No se pudo conectar a MySQL:', error.code || error.message, '(revisa que MySQL este encendido y los datos del .env)');
    }
});
