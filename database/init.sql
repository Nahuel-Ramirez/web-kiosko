-- Script inicial de creación de tablas para Web Kiosko
-- Detalle de cada tabla y diagrama entidad-relación: docs/base-de-datos.md
-- Se puede correr más de una vez: en una base vacía crea todo y en una base que ya
-- existía agrega solo lo que falta, sin borrar datos.

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('ADMIN', 'CAJERO')),
    activo BOOLEAN DEFAULT TRUE,
    dni VARCHAR(20) UNIQUE
);

-- Si la base ya existía de antes (sin esta columna), la agrega sin romper nada.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dni VARCHAR(20) UNIQUE;

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    codigo_barras VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    precio_costo DECIMAL(12, 2) NOT NULL CHECK (precio_costo >= 0),
    precio_venta DECIMAL(12, 2) NOT NULL CHECK (precio_venta >= 0),
    stock_actual INT NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo INT NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Baja lógica: un producto con ventas no se puede borrar, pero sí desactivar.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- Si la base ya existía, agrega los CHECK de precios y stock con el mismo nombre que
-- les pone PostgreSQL al crear la tabla. Falla si ya hay precios o stock negativos.
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_precio_costo_check;
ALTER TABLE productos ADD CONSTRAINT productos_precio_costo_check CHECK (precio_costo >= 0);
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_precio_venta_check;
ALTER TABLE productos ADD CONSTRAINT productos_precio_venta_check CHECK (precio_venta >= 0);
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_stock_actual_check;
ALTER TABLE productos ADD CONSTRAINT productos_stock_actual_check CHECK (stock_actual >= 0);
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_stock_minimo_check;
ALTER TABLE productos ADD CONSTRAINT productos_stock_minimo_check CHECK (stock_minimo >= 0);

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
    fecha_cierre TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    total_efectivo DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_tarjeta DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_transferencia DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    cantidad_ventas INT NOT NULL DEFAULT 0,
    observaciones TEXT,
    monto_inicial DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (monto_inicial >= 0),
    efectivo_contado DECIMAL(12, 2) CHECK (efectivo_contado >= 0),
    diferencia DECIMAL(12, 2) GENERATED ALWAYS AS (efectivo_contado - monto_inicial - total_efectivo) STORED
);

-- HU-20: pago por transferencia. Si la base ya existía, agrega la columna sin romper nada.
ALTER TABLE cierres_caja ADD COLUMN IF NOT EXISTS total_transferencia DECIMAL(12, 2) NOT NULL DEFAULT 0.00;

-- Arqueo de caja: con cuánto arrancó la caja y cuánto efectivo contó el cajero al cerrar.
-- La diferencia la calcula la base: negativa = faltante, positiva = sobrante,
-- NULL = no se hizo el conteo.
ALTER TABLE cierres_caja ADD COLUMN IF NOT EXISTS monto_inicial DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE cierres_caja ADD COLUMN IF NOT EXISTS efectivo_contado DECIMAL(12, 2);
ALTER TABLE cierres_caja ADD COLUMN IF NOT EXISTS diferencia DECIMAL(12, 2)
    GENERATED ALWAYS AS (efectivo_contado - monto_inicial - total_efectivo) STORED;
ALTER TABLE cierres_caja DROP CONSTRAINT IF EXISTS cierres_caja_monto_inicial_check;
ALTER TABLE cierres_caja ADD CONSTRAINT cierres_caja_monto_inicial_check CHECK (monto_inicial >= 0);
ALTER TABLE cierres_caja DROP CONSTRAINT IF EXISTS cierres_caja_efectivo_contado_check;
ALTER TABLE cierres_caja ADD CONSTRAINT cierres_caja_efectivo_contado_check CHECK (efectivo_contado >= 0);

CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    cliente_id INT NOT NULL REFERENCES clientes(id),
    cierre_id INT REFERENCES cierres_caja(id),
    fecha TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(12, 2) NOT NULL CHECK (total >= 0),
    metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA')),
    monto_recibido DECIMAL(12, 2),
    vuelto DECIMAL(12, 2)
);

-- HU-20: si la base ya existía, reemplaza el CHECK viejo (solo EFECTIVO/TARJETA).
-- ventas_metodo_pago_check es el nombre que PostgreSQL le asigna al CHECK de la columna.
ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_metodo_pago_check;
ALTER TABLE ventas ADD CONSTRAINT ventas_metodo_pago_check
    CHECK (metodo_pago IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA'));

ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_total_check;
ALTER TABLE ventas ADD CONSTRAINT ventas_total_check CHECK (total >= 0);

CREATE TABLE IF NOT EXISTS detalle_ventas (
    id SERIAL PRIMARY KEY,
    venta_id INT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0),
    CONSTRAINT detalle_ventas_descuento_check CHECK (subtotal <= cantidad * precio_unitario)
);

-- precio_unitario es el precio de lista y subtotal ya trae el descuento aplicado,
-- así que el subtotal nunca puede superar cantidad * precio_unitario.
ALTER TABLE detalle_ventas DROP CONSTRAINT IF EXISTS detalle_ventas_precio_unitario_check;
ALTER TABLE detalle_ventas ADD CONSTRAINT detalle_ventas_precio_unitario_check CHECK (precio_unitario >= 0);
ALTER TABLE detalle_ventas DROP CONSTRAINT IF EXISTS detalle_ventas_subtotal_check;
ALTER TABLE detalle_ventas ADD CONSTRAINT detalle_ventas_subtotal_check CHECK (subtotal >= 0);
ALTER TABLE detalle_ventas DROP CONSTRAINT IF EXISTS detalle_ventas_descuento_check;
ALTER TABLE detalle_ventas ADD CONSTRAINT detalle_ventas_descuento_check
    CHECK (subtotal <= cantidad * precio_unitario);

-- Fechas con zona horaria, igual que los modelos (DateTime(timezone=True)). Si la base
-- ya existía con TIMESTAMP, convierte las fechas guardadas sin correrlas de hora.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'ventas'
                 AND column_name = 'fecha' AND data_type = 'timestamp without time zone') THEN
        ALTER TABLE ventas ALTER COLUMN fecha TYPE TIMESTAMPTZ;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'cierres_caja'
                 AND column_name = 'fecha_cierre' AND data_type = 'timestamp without time zone') THEN
        ALTER TABLE cierres_caja ALTER COLUMN fecha_cierre TYPE TIMESTAMPTZ;
    END IF;
END $$;

-- Hora de Argentina para toda la base: los reportes por hora y de horas pico usan la
-- hora que devuelve PostgreSQL. Aplica a las conexiones nuevas (reiniciar el backend).
DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I SET timezone TO %L',
                   current_database(), 'America/Argentina/Buenos_Aires');
END $$;

-- Descuento de cada venta: el POS guarda en detalle_ventas el precio de lista y el
-- subtotal ya descontado, así que el descuento sale de la diferencia.
CREATE OR REPLACE VIEW vista_ventas_descuento AS
SELECT v.id AS venta_id,
       v.fecha,
       v.usuario_id,
       v.cliente_id,
       v.metodo_pago,
       SUM(d.cantidad * d.precio_unitario) AS subtotal,
       SUM(d.cantidad * d.precio_unitario) - v.total AS descuento,
       v.total
FROM ventas v
JOIN detalle_ventas d ON d.venta_id = v.id
GROUP BY v.id;

-- Índices para las consultas de turnos y reportes (PostgreSQL no indexa solo las
-- claves foráneas).
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas (fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario_fecha ON ventas (usuario_id, fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_cierre ON ventas (cierre_id);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta ON detalle_ventas (venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_producto ON detalle_ventas (producto_id);
CREATE INDEX IF NOT EXISTS idx_cierres_caja_usuario_fecha ON cierres_caja (usuario_id, fecha_cierre);
CREATE INDEX IF NOT EXISTS idx_cierres_caja_fecha ON cierres_caja (fecha_cierre);

-- Seed inicial: cliente "Consumidor Final". Va con id 1 fijo porque el backend y el
-- POS lo usan como cliente por defecto (cliente_id = 1).
INSERT INTO clientes (id, dni_cuit, razon_social)
VALUES (1, '0', 'Consumidor Final')
ON CONFLICT DO NOTHING;

-- Como el id se cargó a mano, acomoda la secuencia para que el próximo cliente no choque.
DO $$
BEGIN
    PERFORM setval(pg_get_serial_sequence('clientes', 'id'), (SELECT MAX(id) FROM clientes));
    IF NOT EXISTS (SELECT 1 FROM clientes WHERE id = 1 AND dni_cuit = '0') THEN
        RAISE WARNING 'El cliente con id 1 no es Consumidor Final y el POS lo usa como cliente por defecto';
    END IF;
END $$;
