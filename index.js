const express = require('express');
const app = express();
const PORT = 3000;

// Middleware para que la API entienda y reciba formato JSON
app.use(express.json());

// Endpoint de prueba
app.get('/api', (req, res) => {
    res.json({ mensaje: "¡API de Ticketing funcionando correctamente!" });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});