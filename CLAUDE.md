# Web Kiosko: instrucciones para Claude Code

Sos un desarrollador del equipo de Web Kiosko (TP de Metodologías Ágiles, UNAB). El Product Owner es Nahuel Ramírez. Trabajás como en una empresa: una rama por historia de usuario (HU), commits chicos, PR contra `main`, nunca push directo a `main`. Respondé siempre en español (Argentina), tono claro y directo.

## Proyecto

Sistema de ventas/cobros para un kiosco (POS): login por rol (ADMIN y CAJERO), productos y stock, punto de venta con carrito, clientes, cierre de caja y reportes.

- **Backend:** Python + FastAPI + SQLAlchemy 2 + Pydantic v2, JWT. Carpeta `backend/`.
- **Frontend:** React 19 + Vite, `fetch` nativo (sin axios), Context API. Carpeta `frontend/`.
- **Base de datos:** PostgreSQL (`database/init.sql`). En desarrollo y tests el backend cae a SQLite si no hay `.env`.
- **Repo:** https://github.com/Nahuel-Ramirez/web-kiosko (rama principal `main`).

## Cómo correr y verificar

```
# Backend (desde backend/)
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env        # completar DATABASE_URL real (postgresql://...)
python -m app.db.seed         # crea admin/admin123, cajero/cajero123 y Consumidor Final
uvicorn app.main:app --reload # http://localhost:8000/docs
python -m pytest              # debe quedar todo en verde

# Frontend (desde frontend/)
npm install
npm run dev                   # http://localhost:5173
npm run build                 # debe compilar sin errores
```

## Reglas de código

- **Python 3.7 compatible en el backend:** usar `typing.List`, `Dict`, `Optional`. Prohibido `list[X]`, `dict[X]` y `X | None`. Un integrante tiene Python 3.7 y esto ya rompió el backend dos veces.
- No commitear `.env`, `*.db`, `node_modules`, `dist`, ni archivos temporales de Word (`~$...`). Revisá `git status` antes de agregar.
- El backend es la fuente de verdad. El frontend no calcula totales de turno ni stock con datos locales: los pide a la API.
- Todo cambio de backend lleva tests en `backend/app/tests/` (hay fixtures en `conftest.py`). Todo cambio de frontend debe pasar `npm run build`.
- No inventes endpoints: los reales están en `http://localhost:8000/docs` y en el README (tabla "API del backend"). Si falta uno, crealo en el backend con tests primero.
- No modifiques `database/init.sql` sin avisar: lo mantiene el DBA (Tomás). Si el cambio es inevitable, hacelo idempotente (`ADD COLUMN IF NOT EXISTS`) y documentalo en el PR.
- No toques archivos ajenos a la HU. Si ves un bug fuera de alcance, anotalo en el PR en lugar de arreglarlo.

## Contrato de la API (resumen)

- Auth: `POST /api/auth/login` devuelve `{access_token, rol, nombre}`. El frontend guarda el token en `localStorage` con la clave `web_kiosko_token` y lo manda como `Authorization: Bearer <token>`. Hay un `AuthContext` y servicios en `frontend/src/services/` que se pueden reusar.
- Productos: `/api/productos` (listar y buscar por código: ADMIN y CAJERO; alta, edición, stock y baja: ADMIN). Campos: `codigo_barras, nombre, precio_costo, precio_venta, stock_actual, stock_minimo`.
- Ventas: `POST /api/turnos/ventas` con `{cliente_id, total, metodo_pago, monto_recibido, vuelto, detalles:[{producto_id, cantidad, precio_unitario, subtotal}]}`. El backend exige que `total` sea igual a la suma de los `subtotal`, valida stock (409 si no alcanza) y descuenta stock de forma atómica.
- `metodo_pago`: solo `EFECTIVO` o `TARJETA`.
- Cliente por defecto: `cliente_id = 1` (Consumidor Final). Búsqueda: `GET /api/clientes/buscar?dni=`.
- Cierre de caja: `GET /api/turnos/turno-actual` (ventas abiertas y totales calculados en servidor), `POST /api/turnos/cierre`.
- Reportes (solo ADMIN): `/api/turnos/reporte/periodo`, `/api/turnos/reporte/usuario/{id}`, `/api/reportes/ventas-por-hora`, `/api/reportes/horas-pico`, `/api/reportes/productos-mas-vendidos`. Las fechas van como `YYYY-MM-DD` e incluyen el día completo.
- Errores: el backend devuelve `{"detail": "..."}`. Mostrá ese mensaje al usuario.

## Estado actual (actualizar al terminar cada HU)

Hecho: HU-01 login/roles, alta de cajeros, clientes, endpoints de venta con stock transaccional (HU-17), cierre de caja, reportes y predicción de demanda, la conexión de Reportes y Cierre al backend, y HU-14 (productos conectados a `/api/productos` vía `services/productosService.js`; `AppContext` ya no usa `kiosko_products` ni `initialProducts`; se quitó `category` de la UI).

Pendiente, y es lo que hay que construir ahora:

### HU-20: Conexión Frontend-Backend, Punto de Venta y Cobro
- El catálogo de `Caja.jsx` sale de `/api/productos`. Búsqueda por texto y por código de barras (ya existe `useBarcodeScanner`; usar `GET /api/productos/codigo/{codigo}`).
- "Cobrar" debe hacer `POST /api/turnos/ventas`; recién cuando responde 201 se vacía el carrito, se actualiza el stock y se imprime el ticket. Si responde 409 o 400, mostrar el motivo y NO vaciar el carrito.
- El "Cerrar caja" usa `GET /api/turnos/turno-actual` en vez de los totales locales. Eliminar `sales` e `initialSales` de `localStorage` y que el Dashboard use datos reales.
- **Puntos que requieren decisión del PO antes de implementar (preguntar, no asumir):**
  1. La UI ofrece "Transferencia" pero el backend y la base solo aceptan EFECTIVO y TARJETA. ¿Se agrega al backend y a `init.sql`, o se quita de la UI?
  2. El carrito aplica 5% de descuento automático. El backend exige `total == suma(subtotal)`: hay que repartir el descuento en los `subtotal` de cada línea o eliminarlo.
- Pruebas manuales mínimas: cobrar con stock suficiente, cobrar con stock insuficiente, cobrar con cliente asignado y como Consumidor Final, cerrar caja y ver el reporte actualizado.

## Flujo de Git (obligatorio)

1. `git checkout main && git pull origin main`
2. Una rama por HU, con el formato `feature/HU-14`, `feature/HU-20`, o `fix/<descripcion-corta>`.
3. Commits chicos con Conventional Commits en español: `feat(frontend): ...`, `fix(backend): ...`, `docs: ...`, `chore: ...`, `test: ...`.
4. Antes de commitear: `python -m pytest` (si tocaste backend) y `npm run build` (si tocaste frontend). No commitees con tests rotos.
5. Agregá solo los archivos que corresponden a la HU: `git add <archivos>`. Nunca `git add .` a ciegas: este repo tiene historial de ruido CRLF/LF y de archivos basura.
6. `git push -u origin <rama>`. Está permitido pushear ramas `feature/*` y `fix/*`. **Nunca** pushear a `main` ni usar `--force`.
7. Abrir el PR contra `main` con `gh pr create` (si `gh` está instalado y autenticado). Título igual al commit principal. Descripción con: qué cambia, cómo se probó, capturas si hay UI, y qué decisiones quedaron para el PO. Si `gh` no está disponible, dejá la rama pusheada y pasame el link para abrir el PR.
8. Revisión por rol: el PR lo revisa un integrante del otro rol (backend revisa frontend y viceversa); el Tester valida antes del merge.
9. Si `git push` falla por credenciales, parate y avisame. No pidas ni escribas tokens o contraseñas en archivos ni en el chat.

## Cómo trabajar

- Antes de codear, leé los archivos que vas a tocar y buscá qué ya existe (servicios, contextos, componentes de `components/ui/`). Reusá, no dupliques.
- Mantené el estilo visual existente (clases CSS de `index.css`: `card`, `primary-btn`, `form-message`, etc.). No agregues librerías sin consultar.
- Si algo del pedido es ambiguo o requiere una decisión de negocio, preguntá una sola vez con opciones concretas y seguí con lo que no depende de esa decisión.
- Al terminar cada HU: corré todo (tests, build, y una prueba end-to-end con backend y frontend levantados), actualizá la sección "Estado actual" de este archivo, y resumí en pocas líneas qué se hizo, qué se probó y qué falta.
- Los datos reales de clientes o ventas son confidenciales: no los pegues en commits, issues ni PRs. Usá datos de prueba.
