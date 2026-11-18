const path = require('path');
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
        // Ruta relativa: Swagger llama a la misma direccion donde se abrio (en el PC o en internet)
        servers: [{ url: '/' }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
            }
        }
    },
    // Ruta absoluta a los archivos de rutas, con "/" para que funcione en Windows y en Linux
    apis: [path.join(__dirname, '..', 'routes', '*.js').replace(/\\/g, '/')]
};

module.exports = swaggerJsdoc(opciones);
