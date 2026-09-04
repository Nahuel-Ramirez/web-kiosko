# Web Kiosko — Sistema de Cobros para Kiosco/Minimarket

Trabajo práctico de la materia **Metodologías Ágiles** (UNAB). Sistema web de punto de venta (POS) para kioscos y minimercados, desarrollado siguiendo Scrum, con historias de usuario, sprints y un backlog priorizado.

## Descripción

El sistema permite gestionar el catálogo de productos, operar un punto de venta ágil pensado para lector de código de barras, administrar clientes y realizar el cierre de caja con reportes básicos de ventas.

## Actores del sistema

- **Administrador (Dueño):** acceso total. Alta, modificación y consulta de productos (incluye precios de costo y venta), gestión de usuarios, reportes de productos más vendidos y auditoría de cierres de caja.
- **Cajero (Empleado):** acceso restringido al módulo de cobro (POS) y al cierre de su turno. No ve precios de costo ni puede modificar precios o stock manualmente.
- **Cliente (sin credenciales):** registrado en la base de datos solo con fines fiscales o de identificación de ticket/factura.

## Alcance del MVP

- **Autenticación y seguridad:** login con usuario y contraseña, roles (Admin/Cajero) mediante JWT.
- **Catálogo de productos:** alta, edición y búsqueda (nombre, código de barras, costo, precio, stock), código único, alerta de stock crítico (< 5 unidades).
- **Punto de Venta (POS):** operación por teclado/lector de código de barras, carrito dinámico, cálculo automático de vuelto, selección de medio de pago (efectivo/tarjeta), descuento automático de stock.
- **Clientes:** "Consumidor Final" por defecto, alta/búsqueda rápida por CUIT/DNI.
- **Cierre de caja y reportes:** cierre de turno con desglose por efectivo/tarjeta, cantidad de ventas y usuario responsable; reporte de productos más vendidos.

### Fuera de alcance (próximas iteraciones)

Actualización masiva de precios, facturación electrónica (AFIP), cobro digital integrado (QR/Mercado Pago/POSNET), gestión de proveedores y pedidos de compra, descarga de comprobantes en PDF.

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Frontend | HTML, CSS, JavaScript, React |
| Backend | Python + FastAPI |
| Base de datos | PostgreSQL |

## Modelo de datos (resumen)

`usuarios`, `productos`, `clientes`, `cierres_caja`, `ventas`, `detalle_ventas` — el detalle completo de columnas y restricciones está en la guía de desarrollo del proyecto.

## Backlog priorizado (Historias de Usuario)

| ID | Historia de Usuario | Prioridad |
| --- | --- | --- |
| HU-01 | Login con credenciales y control de acceso por rol (JWT) | Alta (Sprint 1) |
| HU-02 | Alta de productos (código, precios, stock) | Alta (Sprint 2) |
| HU-03 | Búsqueda y actualización de precios/stock | Alta (Sprint 2) |
| HU-04 | Alertas visuales de stock bajo (< 5) | Media (Sprint 2) |
| HU-05 | Carrito por escaneo de código de barras | Crítica (Sprint 3) |
| HU-06 | Cálculo automático de vuelto y medio de pago | Crítica (Sprint 3) |
| HU-07 | Asociar cliente a la venta o Consumidor Final | Media (Sprint 3) |
| HU-08 | Cierre de turno / arqueo de caja | Alta (Sprint 4) |
| HU-09 | Reporte de productos más vendidos | Media (Sprint 4) |

## Planificación por Sprints

| Sprint | Entrega | Objetivo |
| --- | --- | --- |
| 1 — Arrancar con Seguridad | 24-09 | Autenticación, control de accesos y base del proyecto |
| 2 — Cargar y Ordenar los Productos | 01-10 | Panel de administración de inventario |
| 3 — La Caja y las Ventas | 15-10 | POS operativo, registro de ventas y descuento de stock |
| 4 — Cierres y Reportes | 05-11 | Cierre de turno, trazabilidad y reportes |

Entrega final del TP: 12-11.

## Equipo

| Nombre | Rol |
| --- | --- |
| Nahuel Ramirez | Product Owner |
| Cassian Damiano Ochoa | Scrum Master |
| Santiago Daniel Bruno | Lead Frontend |
| Lautaro Ramiro Leguizamón | Lead Backend |
| Gustavo Hugo Amaya | Frontend |
| Marcos Joaquin Jara | Backend |
| Tomas Alvarez | DBA |
| Franco Elias Ayala | Tester |

## Cómo contribuir

Ver la guía **"Cómo clonar y pushear al repositorio"** (carpeta del proyecto) para el flujo de trabajo en Git que usa el equipo: ramas, commits y pull requests.

## Documentación

La guía integral de desarrollo (historias de usuario completas, diseño de base de datos y división de tareas por sprint) está disponible en la carpeta del proyecto.
