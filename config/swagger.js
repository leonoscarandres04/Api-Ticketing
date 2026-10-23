const swaggerJsdoc = require('swagger-jsdoc');

// Swagger lee los comentarios @openapi de los archivos de rutas
const opciones = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API de Ticketing',
            version: '1.0.0',
            description: 'API RESTful para la gestion de eventos, control de aforo y venta de entradas digitales'
        },
        servers: [{ url: `http://localhost:${process.env.PORT || 3000}` }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
            }
        }
    },
    apis: ['./routes/*.js']
};

module.exports = swaggerJsdoc(opciones);
