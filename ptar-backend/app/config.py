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

    # ── SharePoint — Device Code Flow con MFA (msal) ─────────────────────────
    # SP_PASSWORD ya NO se usa — autenticación via auth_sharepoint.py (una vez)
    SP_SITE_URL:   str = "https://permodaco.sharepoint.com/sites/CONFIABILIDAD"
    SP_EMAIL:      str = ""    # ej: davidan@permoda.com.co (solo informativo)
    SP_SYNC_HOURS: int = 1     # cada cuántas horas sincronizar automáticamente

    @property
    def sp_enabled(self) -> bool:
        """True si el archivo de token cache existe (auth_sharepoint.py ya fue corrido)"""
        from pathlib import Path
        cache = Path(__file__).resolve().parent.parent / ".sharepoint_token_cache.json"
        return cache.exists()

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
