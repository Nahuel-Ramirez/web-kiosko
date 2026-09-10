-- Script inicial de creación de tablas para Web Kiosko
-- Ver la guía de desarrollo del proyecto para el detalle completo de cada tabla.

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('ADMIN', 'CAJERO')),
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    codigo_barras VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    precio_costo DECIMAL(12, 2) NOT NULL,
    precio_venta DECIMAL(12, 2) NOT NULL,
    stock_actual INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    dni_cuit VARCHAR(20) UNIQUE NOT NULL,
    razon_social VARCHAR(150) NOT NULL,
    domicilio VARCHAR(200),
    telefono VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS cierres_caja (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    fecha_cierre TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_efectivo DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_tarjeta DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    cantidad_ventas INT NOT NULL DEFAULT 0,
    observaciones TEXT
);

CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    cliente_id INT NOT NULL REFERENCES clientes(id),
    cierre_id INT REFERENCES cierres_caja(id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(12, 2) NOT NULL,
    metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'TARJETA')),
    monto_recibido DECIMAL(12, 2),
    vuelto DECIMAL(12, 2)
);

CREATE TABLE IF NOT EXISTS detalle_ventas (
    id SERIAL PRIMARY KEY,
    venta_id INT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL
);

-- Seed inicial: cliente "Consumidor Final"
INSERT INTO clientes (dni_cuit, razon_social)
VALUES ('0', 'Consumidor Final')
ON CONFLICT (dni_cuit) DO NOTHING;
