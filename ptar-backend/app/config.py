from pydantic_settings import BaseSettings
from pydantic import field_validator

INSECURE_DEFAULTS = {"ptar-permoda-secret-2026", "changeme", "secret", ""}

class Settings(BaseSettings):
    DB_HOST: str
    DB_PORT: int = 3306
    DB_NAME: str
    DB_USER: str
    DB_PASS: str
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8001
    CORS_ORIGIN: str = "http://localhost:5174"
    JWT_SECRET: str  # REQUERIDO en .env — sin valor por defecto
    JWT_EXPIRY_HOURS: int = 24

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if v in INSECURE_DEFAULTS:
            raise ValueError(
                "JWT_SECRET no puede ser el valor por defecto inseguro. "
                "Genera uno con: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if len(v) < 32:
            raise ValueError("JWT_SECRET debe tener al menos 32 caracteres.")
        return v

    @property
    def database_url(self) -> str:
        return (
            f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )

    class Config:
        env_file = ".env"

settings = Settings()
