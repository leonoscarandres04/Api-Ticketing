-- Base de datos del Sistema de Ticketing
-- Entidades: Usuario, Evento, Compra y Boleta
-- Ejecutar: mysql -u root -p < database/schema.sql

DROP DATABASE IF EXISTS ticketing;
CREATE DATABASE ticketing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ticketing;

-- Usuarios con rol de organizador o comprador
CREATE TABLE usuarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,          -- se guarda encriptada (bcrypt)
    rol         ENUM('organizador', 'comprador') NOT NULL DEFAULT 'comprador',
    creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Eventos creados por un organizador
CREATE TABLE eventos (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    organizador_id    INT NOT NULL,
    nombre            VARCHAR(150) NOT NULL,
    descripcion       TEXT,
    lugar             VARCHAR(150) NOT NULL,
    fecha             DATETIME NOT NULL,
    aforo_total       INT NOT NULL,
    aforo_disponible  INT NOT NULL,
    precio            DECIMAL(10, 2) NOT NULL DEFAULT 0,
    estado            ENUM('activo', 'cancelado', 'finalizado') NOT NULL DEFAULT 'activo',
    imagen_url        VARCHAR(500) NULL,                  -- link de la imagen del evento
    tipo              ENUM('general', 'numerado') NOT NULL DEFAULT 'general',  -- entrada general o sillas numeradas
    filas             INT NULL,                           -- solo para sillas numeradas
    sillas_por_fila   INT NULL,                           -- solo para sillas numeradas
    creado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_eventos_organizador FOREIGN KEY (organizador_id) REFERENCES usuarios(id),
    -- Evita la sobreventa desde la propia base de datos
    CONSTRAINT chk_aforo CHECK (aforo_total > 0 AND aforo_disponible >= 0 AND aforo_disponible <= aforo_total)
);

-- Compras de un comprador para un evento (el pago es simulado)
CREATE TABLE compras (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    comprador_id  INT NOT NULL,
    evento_id     INT NOT NULL,
    cantidad      INT NOT NULL,
    total         DECIMAL(10, 2) NOT NULL,
    estado        ENUM('pendiente', 'pagada', 'cancelada') NOT NULL DEFAULT 'pendiente',
    creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_compras_comprador FOREIGN KEY (comprador_id) REFERENCES usuarios(id),
    CONSTRAINT fk_compras_evento FOREIGN KEY (evento_id) REFERENCES eventos(id),
    CONSTRAINT chk_cantidad CHECK (cantidad > 0)
);

-- Boletas generadas por cada compra; el codigo unico sirve para validar la entrada
CREATE TABLE boletas (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    compra_id   INT NOT NULL,
    evento_id   INT NOT NULL,
    codigo      VARCHAR(64) NOT NULL UNIQUE,
    estado      ENUM('valida', 'usada', 'anulada') NOT NULL DEFAULT 'valida',
    usada_en    DATETIME NULL,
    creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_boletas_compra FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
    CONSTRAINT fk_boletas_evento FOREIGN KEY (evento_id) REFERENCES eventos(id)
);

-- Sillas de los eventos numerados; boleta_id es la boleta que ocupa la silla (NULL = libre)
CREATE TABLE sillas (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    evento_id   INT NOT NULL,
    fila        VARCHAR(2) NOT NULL,
    numero      INT NOT NULL,
    boleta_id   INT NULL UNIQUE,
    CONSTRAINT fk_sillas_evento FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
    CONSTRAINT fk_sillas_boleta FOREIGN KEY (boleta_id) REFERENCES boletas(id) ON DELETE SET NULL,
    CONSTRAINT uq_silla UNIQUE (evento_id, fila, numero)
);

-- Datos de prueba (password de ambos: 123456, encriptada con bcrypt)
INSERT INTO usuarios (nombre, email, password, rol) VALUES
('Organizador Demo', 'organizador@ticketing.com', '$2b$10$TeBQKySVHH/RWCGls.Hjhe356gWeQW1M7FWUGdGwbuucraAsksR0C', 'organizador'),
('Comprador Demo',   'comprador@ticketing.com',   '$2b$10$TeBQKySVHH/RWCGls.Hjhe356gWeQW1M7FWUGdGwbuucraAsksR0C', 'comprador');

INSERT INTO eventos (organizador_id, nombre, descripcion, lugar, fecha, aforo_total, aforo_disponible, precio, imagen_url) VALUES
(1, 'Concierto de Rock', 'Bandas locales en vivo', 'Teatro Jorge Eliecer Gaitan', '2026-12-05 19:00:00', 100, 100, 50000,
    'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=70'),
(1, 'Partido de Futbol', 'Clasico capitalino',     'Estadio El Campin',           '2026-12-12 16:00:00', 500, 500, 80000,
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=70');

-- Evento con sillas numeradas: 8 filas (A a H) de 12 sillas = 96 cupos
INSERT INTO eventos (organizador_id, nombre, descripcion, lugar, fecha, aforo_total, aforo_disponible, precio, imagen_url, tipo, filas, sillas_por_fila) VALUES
(1, 'Obra de Teatro', 'Comedia para toda la familia', 'Teatro Colon', '2026-12-19 20:00:00', 96, 96, 60000,
    'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=70', 'numerado', 8, 12);

INSERT INTO sillas (evento_id, fila, numero)
WITH RECURSIVE f (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM f WHERE n < 8),
               s (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 12)
SELECT 3, CHAR(64 + f.n), s.n FROM f CROSS JOIN s ORDER BY f.n, s.n;
