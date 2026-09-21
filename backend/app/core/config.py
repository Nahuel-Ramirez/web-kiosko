from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración de la app, leída desde variables de entorno (.env).

    Ver backend/.env.example para la plantilla de variables requeridas.
    """

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    # Valores por defecto solo para poder importar la app y correr tests
    # (ej: pytest) sin tener un .env armado todavía. Para levantar el
    # servidor de verdad, definir estos valores en backend/.env (ver
    # .env.example) con la conexión real a PostgreSQL y una clave propia.
    database_url: str = "sqlite:///./dev.db"
    jwt_secret_key: str = "clave-de-desarrollo-cambiar-en-produccion"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60


settings = Settings()
