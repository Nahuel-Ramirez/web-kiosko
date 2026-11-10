"""Datos de ejemplo (ficticios) para mostrar la app: productos, clientes, ventas y cierres.

Carga 30 dias de ventas con picos al mediodia y a la tarde, un cierre de caja con arqueo
por dia y cajero, y deja abiertas las ventas de hoy para poder cerrar caja en vivo.
Todos usan los mismos datos (semilla fija); las fechas son relativas al dia en que se carga.

Requiere la base creada (database/init.sql) y el seed aplicado (python -m app.db.seed):

    cd backend
    python -m app.db.demo            # carga los datos de ejemplo
    python -m app.db.demo --borrar   # los borra

El borrado identifica los datos de ejemplo por sus marcas: codigos de barras que empiezan
con 77990001, los DNI/CUIT de CLIENTES y la observacion "(datos de ejemplo)" en los cierres.
Tambien borra cualquier venta que incluya un producto o cliente de ejemplo.
"""
import random
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.cierre_caja import CierreCaja
from app.models.cliente import Cliente
from app.models.movimiento_fiado import MovimientoFiado
from app.models.producto import Producto
from app.models.usuario import Usuario
from app.models.venta import DetalleVenta, Venta

PREFIJO_CODIGO = "77990001"
MARCA_CIERRE = "(datos de ejemplo)"

# nombre, costo, venta, stock final (algunos bajos para que aparezcan alertas)
PRODUCTOS = [
    ("Gaseosa cola 500 ml", 1300, 2200, 140), ("Gaseosa lima-limon 500 ml", 1250, 2100, 95),
    ("Gaseosa naranja 1,5 L", 2100, 3600, 60), ("Agua mineral 500 ml", 700, 1300, 180),
    ("Agua saborizada pomelo 500 ml", 900, 1600, 75), ("Jugo de naranja 1 L", 1500, 2600, 40),
    ("Bebida energizante 473 ml", 1900, 3200, 30), ("Agua con gas 1,5 L", 1000, 1800, 110),
    ("Cafe en vaso", 600, 1500, 200), ("Alfajor triple chocolate", 900, 1700, 160),
    ("Alfajor de maicena", 600, 1200, 120), ("Chocolate con leche 80 g", 1400, 2500, 70),
    ("Chocolate amargo 80 g", 1500, 2700, 45), ("Caramelos masticables x10", 500, 1000, 150),
    ("Chicles de menta", 450, 900, 130), ("Turron de mani", 350, 700, 4),
    ("Galletitas dulces 150 g", 900, 1600, 85), ("Galletitas de agua 200 g", 800, 1400, 100),
    ("Papas fritas 90 g", 1300, 2300, 55), ("Mani salado 120 g", 900, 1600, 38),
    ("Palitos salados 100 g", 800, 1400, 0), ("Barra de cereal", 500, 1000, 90),
    ("Sandwich de miga JyQ x2", 1500, 2800, 12), ("Medialuna", 300, 650, 200),
    ("Yerba mate 500 g", 2600, 4200, 25), ("Pan lactal", 1900, 3100, 18),
    ("Leche entera 1 L", 1100, 1800, 60), ("Pilas AA x2", 1800, 3200, 22),
    ("Encendedor", 600, 1200, 3), ("Panuelos descartables", 500, 1000, 75),
    ("Preservativos x3", 1700, 3000, 15), ("Helado palito agua", 500, 1100, 48),
    ("Gaseosa de uva 500 ml", 1200, 2000, 88), ("Gaseosa de manzana 500 ml", 1200, 2000, 70),
    ("Agua mineral sin gas 1,5 L", 900, 1500, 65), ("Agua mineral con gas 500 ml", 750, 1400, 55),
    ("Jugo de manzana 1 L", 1400, 2400, 35), ("Jugo de multifruta 1 L", 1450, 2500, 33),
    ("Te helado durazno 500 ml", 1100, 1900, 60), ("Te helado limon 500 ml", 1050, 1850, 62),
    ("Cerveza rubia 1 L", 1600, 2800, 40), ("Cerveza negra 1 L", 1700, 3000, 28),
    ("Vino tinto 750 ml", 2500, 4200, 20), ("Vino blanco 750 ml", 2400, 4000, 22),
    ("Sidra 1 L", 1300, 2300, 30), ("Aguardiente 200 ml", 3000, 5000, 10),
    ("Ron blanco 750 ml", 3500, 5500, 8), ("Whisky 750 ml", 5000, 8500, 5),
    ("Gancia 750 ml", 1800, 3200, 15), ("Campari 750 ml", 2200, 3800, 7),
    ("Alfajor de dulce de leche", 700, 1300, 100), ("Alfajor de chocolate negro", 800, 1400, 90),
    ("Bombon de chocolate", 400, 800, 140), ("Caramelo duro x20", 300, 700, 110),
    ("Chicle de frutilla", 400, 850, 120), ("Galletitas de coco 150 g", 850, 1500, 48),
    ("Galletitas integrales 200 g", 950, 1650, 40), ("Galletitas rellenas chocolate", 1100, 1900, 35),
    ("Galletitas saladas soda", 700, 1300, 60), ("Papas fritas bbq 90 g", 1400, 2400, 50),
    ("Papas fritas crema cebolla 90 g", 1400, 2400, 45), ("Mani con piel 100 g", 600, 1100, 70),
    ("Mani cubierto chocolate", 900, 1600, 25), ("Almendras tostadas 80 g", 1200, 2200, 15),
    ("Nueces de la india 50 g", 1500, 2800, 6), ("Barrita de proteinas", 600, 1200, 80),
    ("Barrita de frutos secos", 700, 1300, 45), ("Helado palito crema", 600, 1200, 40),
    ("Helado palito chocolate", 650, 1300, 38), ("Helado pote 1/4 kg", 1800, 3200, 18),
    ("Leche descremada 1 L", 1050, 1700, 50), ("Yogur de fruta 150 g", 500, 950, 55),
    ("Yogur natural 500 g", 700, 1300, 40), ("Queso cremoso 200 g", 1400, 2400, 12),
    ("Jamon cocido 100 g", 1200, 2100, 8), ("Salame 100 g", 1500, 2600, 9),
    ("Queso rallado 100 g", 1100, 1900, 20), ("Mermelada de frutilla 350 g", 1600, 2700, 14),
    ("Dulce de leche 500 g", 1500, 2600, 25), ("Miel de abejas 500 g", 1800, 3000, 10),
    ("Azucar 1 kg", 600, 1100, 30), ("Edulcorante sobre x50", 900, 1600, 20),
    ("Cafe molido 250 g", 2200, 3800, 12), ("Te en bolsitas x20", 700, 1300, 25),
    ("Mate cocido 250 g", 800, 1400, 18), ("Soda en sifon 1 L", 1100, 1900, 16),
    ("Agua tonica 500 ml", 1000, 1700, 22), ("Agua de soda 500 ml", 900, 1500, 24),
    ("Agua de coco 500 ml", 900, 1600, 18), ("Limonada 500 ml", 800, 1400, 20),
    ("Jarabe de chocolate", 1200, 2100, 10), ("Salsa de tomate 350 g", 900, 1500, 15),
    ("Mayonesa 250 g", 1100, 1900, 12), ("Mostaza 250 g", 800, 1400, 10),
    ("Ketchup 350 g", 950, 1600, 14), ("Aceite girasol 900 ml", 2200, 3800, 8),
    ("Vinagre alcohol 500 ml", 700, 1200, 10), ("Sal gruesa 1 kg", 400, 800, 25),
    ("Fideos espagueti 500 g", 900, 1500, 18), ("Arroz blanco 1 kg", 1100, 1900, 20),
    ("Harina 000 1 kg", 700, 1200, 16), ("Azucar morena 1 kg", 700, 1200, 14),
    ("Pan de molde", 1200, 2000, 10), ("Galletas de agua salada", 600, 1100, 20),
    ("Galletas dulces de fruta", 700, 1200, 15), ("Gaseosa de frutilla 1,5 L", 2000, 3400, 28),
    ("Gaseosa de uva 1,5 L", 2000, 3400, 26), ("Gaseosa de manzana 1,5 L", 2000, 3400, 24),
    ("Gaseosa de pomelo 1,5 L", 2000, 3400, 22), ("Cerveza rubia 750 ml", 1200, 2100, 32),
    ("Cerveza negra 750 ml", 1300, 2200, 24), ("Vino tinto 1 L", 3200, 5200, 10),
    ("Vino blanco 1 L", 3100, 5000, 12), ("Espumante 750 ml", 2800, 4600, 7),
    ("Gancia 1 L", 2400, 4000, 14), ("Ron blanco 1 L", 4500, 7200, 5),
    ("Whisky 1 L", 6500, 10500, 4), ("Aguardiente 500 ml", 4500, 7500, 8),
]
# probabilidad relativa de que se venda cada producto (mismo orden que PRODUCTOS)
POPULARIDAD = [9, 6, 3, 8, 4, 3, 3, 3, 7, 9,
               6, 5, 3, 5, 4, 3, 4, 3, 5, 3,
               3, 4, 3, 7, 2, 2, 3, 1, 2, 2,
               1, 3,
               5, 5, 4, 3, 4, 3, 4, 5, 3, 3,
               3, 2, 3, 4, 4, 3, 2, 3, 4, 4,
               3, 2, 2, 4, 5, 3, 4, 5, 4, 3,
               3, 4, 3, 3, 4, 3, 4, 3, 2, 3,
               4, 3, 3, 2, 4, 4, 3, 3, 2, 4,
               3, 4, 3, 3, 4, 2, 3, 3, 4, 3,
               4, 2, 4, 4, 3, 3, 2, 4, 3, 4,
               3, 2, 3, 4, 3, 3, 3, 4, 3, 3,
               2, 4, 4, 3, 3, 2]

# dni/cuit, nombre, domicilio, telefono (todos inventados)
CLIENTES = [
    ("20111222", "Martina Gomez", "Av. Rivadavia 4500", "11-5555-0101"),
    ("27333444", "Lucas Fernandez", "Calle Falsa 123", "11-5555-0102"),
    ("23444555", "Sofia Martinez", "Belgrano 980", "11-5555-0103"),
    ("20555666", "Joaquin Lopez", "San Martin 1500", "11-5555-0104"),
    ("27666777", "Valentina Diaz", "Mitre 210", "11-5555-0105"),
    ("20777888", "Mateo Romero", "Sarmiento 77", "11-5555-0106"),
    ("27888999", "Camila Suarez", "Moreno 640", "11-5555-0107"),
    ("30712345678", "Club de Barrio Demo", "Lavalle 300", "11-5555-0108"),
    ("30798765432", "Libreria Demo SRL", "Corrientes 2100", "11-5555-0109"),
    ("20999000", "Tomas Benitez", "Alsina 45", "11-5555-0110"),
]

# peso de cada hora (7 a 22 h): pico a la manana, al mediodia y a la salida del trabajo
PESO_HORA = {7: 3, 8: 7, 9: 5, 10: 4, 11: 5, 12: 10, 13: 9, 14: 5, 15: 4,
             16: 5, 17: 7, 18: 10, 19: 9, 20: 6, 21: 3, 22: 1}
MONTO_INICIAL = Decimal("5000.00")


def _pago_en_efectivo(rnd: random.Random, total: Decimal) -> Decimal:
    """Billete con el que paga el cliente (a veces paga justo)."""
    for billete in (1000, 2000, 5000, 10000, 20000):
        if billete >= total:
            return Decimal(billete) if rnd.random() < 0.7 else total
    return total


def hay_datos_demo(db: Session) -> bool:
    return db.query(Producto).filter(Producto.codigo_barras.like(PREFIJO_CODIGO + "%")).first() is not None


def cargar(db: Session, dias: int = 30, ahora: Optional[datetime] = None) -> Dict[str, int]:
    """Carga los datos de ejemplo en una transaccion. Devuelve cuantos registros creo."""
    if hay_datos_demo(db):
        raise ValueError("Ya hay datos de ejemplo cargados. Borralos con: python -m app.db.demo --borrar")
    cajeros = [u.id for u in db.query(Usuario)
               .filter(Usuario.rol == "CAJERO", Usuario.activo.is_(True)).order_by(Usuario.id)]
    if not cajeros:
        raise ValueError("No hay cajeros activos. Corre primero: python -m app.db.seed")
    consumidor_final = db.query(Cliente).filter(Cliente.dni_cuit == "0").first()
    if not consumidor_final:
        raise ValueError("Falta el cliente Consumidor Final. Corre primero: python -m app.db.seed")

    rnd = random.Random(2026)
    ahora = ahora or datetime.now()
    try:
        productos = []
        for i, (nombre, costo, venta, stock) in enumerate(PRODUCTOS):
            p = Producto(codigo_barras="%s%05d" % (PREFIJO_CODIGO, i + 1), nombre=nombre,
                         precio_costo=Decimal(costo), precio_venta=Decimal(venta),
                         stock_actual=stock, stock_minimo=10)
            db.add(p)
            productos.append(p)
        clientes = []
        for dni, nombre, domicilio, telefono in CLIENTES:
            c = Cliente(dni_cuit=dni, razon_social=nombre, domicilio=domicilio, telefono=telefono)
            db.add(c)
            clientes.append(c)
        db.flush()

        horas = list(PESO_HORA.keys())
        ventas_cerradas = {}  # (dia, cajero) -> ventas de dias anteriores a hoy
        cantidad_ventas = 0
        hoy = ahora.date()
        for dias_atras in range(dias, -1, -1):
            dia = hoy - timedelta(days=dias_atras)
            # hoy solo hay ventas hasta la hora actual, para que el turno abierto sea creible
            horas_dia = horas if dias_atras else ([h for h in horas if h <= ahora.hour] or [horas[0]])
            base = 34 if dia.weekday() >= 5 else 26  # sabado y domingo se vende mas
            for _ in range(base + rnd.randint(-5, 6)):
                hora = rnd.choices(horas_dia, weights=[PESO_HORA[h] for h in horas_dia])[0]
                fecha = datetime(dia.year, dia.month, dia.day, hora, rnd.randint(0, 59), rnd.randint(0, 59))
                if fecha > ahora:
                    fecha = ahora - timedelta(minutes=rnd.randint(1, 30))
                cajero = rnd.choice(cajeros)

                detalles = []  # type: List[DetalleVenta]
                total = Decimal("0")
                for idx in rnd.sample(range(len(productos)), rnd.choices([1, 2, 3, 4], [45, 30, 17, 8])[0]):
                    if POPULARIDAD[idx] < rnd.randint(1, 9):
                        idx = rnd.choices(range(len(productos)), POPULARIDAD)[0]
                    if any(d.producto_id == productos[idx].id for d in detalles):
                        continue
                    cantidad = rnd.choices([1, 2, 3], [70, 22, 8])[0]
                    precio = productos[idx].precio_venta
                    detalles.append(DetalleVenta(producto_id=productos[idx].id, cantidad=cantidad,
                                                 precio_unitario=precio, subtotal=precio * cantidad))
                    total += precio * cantidad

                metodo = rnd.choices(["EFECTIVO", "TARJETA"], [65, 35])[0]
                recibido = _pago_en_efectivo(rnd, total) if metodo == "EFECTIVO" else total
                cliente_id = rnd.choice(clientes).id if rnd.random() < 0.2 else consumidor_final.id
                venta = Venta(usuario_id=cajero, cliente_id=cliente_id, fecha=fecha, total=total,
                              metodo_pago=metodo, monto_recibido=recibido, vuelto=recibido - total,
                              detalles=detalles)
                db.add(venta)
                cantidad_ventas += 1
                if dias_atras:
                    ventas_cerradas.setdefault((dia, cajero), []).append(venta)
        db.flush()

        # Un cierre con arqueo por dia y cajero (dias anteriores a hoy), con alguna diferencia chica
        for (dia, cajero), ventas in sorted(ventas_cerradas.items()):
            efectivo = sum((v.total for v in ventas if v.metodo_pago == "EFECTIVO"), Decimal("0"))
            ajuste = Decimal(rnd.choice([0, 0, 0, 0, -100, -50, 50, 100, -300]))
            cierre = CierreCaja(
                usuario_id=cajero, fecha_cierre=datetime(dia.year, dia.month, dia.day, 22, 30),
                total_efectivo=efectivo,
                total_tarjeta=sum((v.total for v in ventas if v.metodo_pago == "TARJETA"), Decimal("0")),
                total_transferencia=sum((v.total for v in ventas if v.metodo_pago == "TRANSFERENCIA"), Decimal("0")),
                cantidad_ventas=len(ventas), monto_inicial=MONTO_INICIAL,
                efectivo_contado=MONTO_INICIAL + efectivo + ajuste,
                observaciones="Cierre del %s %s" % (dia.strftime("%d/%m"), MARCA_CIERRE))
            db.add(cierre)
            db.flush()
            for v in ventas:
                v.cierre_id = cierre.id

        db.commit()
    except BaseException:
        db.rollback()
        raise
    return {"productos": len(productos), "clientes": len(clientes),
            "ventas": cantidad_ventas, "cierres": len(ventas_cerradas)}


def borrar(db: Session) -> Dict[str, int]:
    """Borra los datos de ejemplo (y las ventas que los incluyan) en una transaccion."""
    try:
        productos = [p.id for p in db.query(Producto.id).filter(Producto.codigo_barras.like(PREFIJO_CODIGO + "%"))]
        clientes = [c.id for c in db.query(Cliente.id).filter(Cliente.dni_cuit.in_([c[0] for c in CLIENTES]))]
        ventas = [v.id for v in db.query(Venta.id).filter(or_(
            Venta.cliente_id.in_(clientes or [-1]),
            Venta.detalles.any(DetalleVenta.producto_id.in_(productos or [-1])),
        ))]
        cierres = [c.id for c in db.query(CierreCaja.id).filter(CierreCaja.observaciones.like("%" + MARCA_CIERRE))]

        db.query(MovimientoFiado).filter(or_(
            MovimientoFiado.cliente_id.in_(clientes or [-1]),
            MovimientoFiado.venta_id.in_(ventas or [-1]),
        )).delete(synchronize_session=False)
        db.query(DetalleVenta).filter(DetalleVenta.venta_id.in_(ventas or [-1])).delete(synchronize_session=False)
        db.query(Venta).filter(Venta.id.in_(ventas or [-1])).delete(synchronize_session=False)
        # si quedara alguna venta real dentro de un cierre de ejemplo, se desvincula antes de borrarlo
        db.query(Venta).filter(Venta.cierre_id.in_(cierres or [-1])).update({Venta.cierre_id: None}, synchronize_session=False)
        db.query(MovimientoFiado).filter(MovimientoFiado.cierre_id.in_(cierres or [-1])).update(
            {MovimientoFiado.cierre_id: None}, synchronize_session=False)
        db.query(CierreCaja).filter(CierreCaja.id.in_(cierres or [-1])).delete(synchronize_session=False)
        db.query(Producto).filter(Producto.id.in_(productos or [-1])).delete(synchronize_session=False)
        db.query(Cliente).filter(Cliente.id.in_(clientes or [-1])).delete(synchronize_session=False)
        db.commit()
    except BaseException:
        db.rollback()
        raise
    return {"productos": len(productos), "clientes": len(clientes), "ventas": len(ventas), "cierres": len(cierres)}


def main(argv: List[str]) -> int:
    db = SessionLocal()
    try:
        if "--borrar" in argv:
            print("Datos de ejemplo borrados:", borrar(db))
        else:
            print("Datos de ejemplo cargados:", cargar(db))
    except ValueError as e:
        print(e)
        return 1
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
