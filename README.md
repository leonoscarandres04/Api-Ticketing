# API de Ticketing

API RESTful para la gestión de eventos y venta de entradas digitales: administra eventos, controla el aforo en tiempo real, procesa compras y valida boletos para evitar la venta duplicada.

**Equipo:** Andres Felipe Morales Velosa, Oscar Andres Leon Galarza, Isabela Martínez Peñaloza
**Materia:** Desarrollo de Software Web Backend

## Tecnologías

- Node.js + Express
- MySQL (`mysql2`)
- JWT para autenticación con roles `organizador` y `comprador`
- Swagger para la documentación

## Cómo correr el proyecto

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear la base de datos con las tablas y datos de prueba:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   (o abrir `database/schema.sql` en MySQL Workbench y ejecutarlo)
3. Copiar `.env.example` como `.env` y poner la contraseña de MySQL de cada uno.
4. Levantar el servidor:
   ```bash
   npm run dev
   ```
   - API: http://localhost:3000/api
   - Documentación Swagger: http://localhost:3000/api-docs

## Estructura

```
config/        conexión a MySQL y configuración de Swagger
controllers/   lógica de cada endpoint
database/      script SQL de la base de datos
middlewares/   autenticación/roles y manejo de errores
models/        consultas SQL de cada tabla
routes/        definición de las rutas (y comentarios de Swagger)
index.js       arranque del servidor
```

## Endpoints

| Método | Ruta | Estado |
|---|---|---|
| GET | `/api/eventos` | Listo |
| GET | `/api/eventos/:id` | Listo |
| POST | `/api/eventos` | Listo |
| PUT | `/api/eventos/:id` | Listo |
| DELETE | `/api/eventos/:id` | Listo |
| GET | `/api/boletos` (`?evento_id=`) | Listo |
| GET | `/api/boletos/:id` | Listo |
| PATCH | `/api/boletos/:id/anular` | Listo (falta devolver el cupo) |
| DELETE | `/api/boletos/:id` | Listo |
| POST | `/api/boletos/validar` | Pendiente |
| GET | `/api/compras` | Listo |
| GET | `/api/compras/:id` | Listo |
| POST | `/api/compras` | Pendiente |
| POST | `/api/compras/:id/pagar` | Pendiente |
| GET | `/api/usuarios` | Listo |
| GET | `/api/usuarios/:id` | Listo |
| POST | `/api/auth/registro` | Pendiente |
| POST | `/api/auth/login` | Pendiente |

## Pendientes

Buscar `TODO` en el código para ver dónde va cada cosa.

- **Autenticación:** registro y login con JWT (`authController.js`) y completar `middlewares/auth.js` (por ahora deja pasar todo).
- **Flujo de compra y aforo:** crear la compra en una transacción que bloquee el evento, descuente el aforo y genere los boletos (`compraModel.js`); pago simulado.
- **Validación de boletos:** marcar el boleto como usado y rechazar los repetidos o anulados.
- **Swagger:** documentar boletos, compras, usuarios y auth (ya está el ejemplo en `routes/eventoRoutes.js`).
- **Pruebas:** concurrencia y prevención de sobreventa.

Usuarios de prueba (contraseña `123456`): `organizador@ticketing.com` y `comprador@ticketing.com`.
