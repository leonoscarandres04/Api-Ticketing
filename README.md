# API de Ticketing

API RESTful para la gestión de eventos y venta de entradas digitales: administra eventos, controla el aforo en tiempo real, procesa compras y valida boletas para evitar la venta duplicada. Incluye una página web para comprar boletas y validarlas en la entrada con código QR.

**Equipo:** Andres Felipe Morales Velosa, Oscar Andres Leon Galarza, Isabela Martínez Peñaloza
**Materia:** Desarrollo de Software Web Backend

## Tecnologías

- Node.js + Express
- MySQL (`mysql2`)
- JWT y bcrypt para autenticación con roles `organizador` y `comprador`
- Swagger para la documentación
- Página web en HTML, CSS y JavaScript (carpeta `public/`), con `qrcode-generator` y `jsqr` para los códigos QR

## Cómo correr el proyecto

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear la base de datos con las tablas y datos de prueba (si ya la tenían, vuelvan a correrlo: borra y crea todo de nuevo):
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   (o abrir `database/schema.sql` en MySQL Workbench y ejecutarlo)
3. Copiar `.env.example` como `.env` y poner la contraseña de MySQL de cada uno.
4. Levantar el servidor:
   ```bash
   npm run dev
   ```
   - Página web: http://localhost:3000
   - API: http://localhost:3000/api
   - Documentación Swagger: http://localhost:3000/api-docs

Usuarios de prueba (contraseña `123456`): `organizador@ticketing.com` y `comprador@ticketing.com`.

## Estructura

```
config/        conexión a MySQL y configuración de Swagger
controllers/   lógica de cada endpoint
database/      script SQL de la base de datos
middlewares/   autenticación/roles y manejo de errores
models/        consultas SQL de cada tabla
routes/        definición de las rutas (y comentarios de Swagger)
public/        página web (frontend)
pruebas/       pruebas de concurrencia y sobreventa
index.js       arranque del servidor
```

## Endpoints

| Método | Ruta | Quién |
|---|---|---|
| POST | `/api/auth/registro` | Cualquiera |
| POST | `/api/auth/login` | Cualquiera |
| GET | `/api/usuarios` | Organizador |
| GET | `/api/usuarios/:id` | Con sesión (el comprador solo se ve a sí mismo) |
| GET | `/api/eventos` | Cualquiera |
| GET | `/api/eventos/:id` | Cualquiera |
| GET | `/api/eventos/:id/sillas` | Cualquiera (mapa de sillas de eventos numerados) |
| POST | `/api/eventos` | Organizador |
| PUT | `/api/eventos/:id` | Organizador dueño del evento |
| DELETE | `/api/eventos/:id` | Organizador dueño del evento |
| GET | `/api/compras` | Con sesión (el comprador ve solo las suyas) |
| GET | `/api/compras/:id` | Con sesión |
| POST | `/api/compras` | Comprador |
| POST | `/api/compras/:id/pagar` | Comprador dueño de la compra |
| GET | `/api/boletas` (`?evento_id=`) | Con sesión (cada quien ve solo las suyas) |
| GET | `/api/boletas/:id` | Con sesión |
| POST | `/api/boletas/validar` | Organizador dueño del evento |
| PATCH | `/api/boletas/:id/anular` | Organizador dueño del evento |
| DELETE | `/api/boletas/:id` | Organizador dueño del evento |

## Reglas del negocio

- **Sin sobreventa:** la compra bloquea el evento mientras revisa y descuenta el aforo, así varias compras al mismo tiempo no pueden vender más cupos de los que hay.
- **Dos tipos de evento:** entrada general (se compra una cantidad) o sillas numeradas (cada comprador escoge sus sillas en un mapa; una silla nunca queda vendida dos veces).
- **Máximo 10 boletas por persona** en cada evento, sumando todas sus compras (las anuladas o vencidas no cuentan).
- **15 minutos para pagar:** si la compra no se paga a tiempo se cancela sola, sus boletas se anulan y los cupos (y sillas) vuelven al evento.
- **Validación en la entrada:** solo boletas pagadas, de un evento activo y del organizador que valida; cada boleta deja entrar una sola vez, aunque la escaneen en dos puertas al mismo tiempo.
- **Anular o eliminar** una boleta válida devuelve el cupo (y la silla) al evento.

## Pruebas

Con el servidor y MySQL encendidos:

```bash
node pruebas/concurrencia.js
```
