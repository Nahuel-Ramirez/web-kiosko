# Importa todos los modelos acá para que SQLAlchemy pueda resolver las
# relaciones entre clases (ej: Usuario.cierres -> "CierreCaja") sin importar
# desde qué módulo se empiece a consultar la base. Sin esto, cosas como
# `from app.models.usuario import Usuario` seguido de una query rompen con
# "failed to locate a name" si el modelo relacionado no fue importado antes.
from app.models.usuario import Usuario  # noqa: F401
from app.models.cliente import Cliente  # noqa: F401
from app.models.producto import Producto  # noqa: F401
from app.models.cierre_caja import CierreCaja  # noqa: F401
from app.models.venta import Venta, DetalleVenta  # noqa: F401
