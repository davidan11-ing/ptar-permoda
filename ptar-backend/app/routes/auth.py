from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
import bcrypt
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import get_db
from app.auth.jwt import create_access_token

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

# ── Modelos ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    id: str
    email: str
    nombre: str
    role: str
    access_token: str
    token_type: str = "bearer"

# ── Login real con contraseña ─────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")  # Máx 10 intentos por minuto por IP
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    # 1. Buscar usuario por email
    row = (await db.execute(
        text("SELECT id, email, nombre, role, password_hash FROM ptar_users WHERE email = :email"),
        {"email": body.email},
    )).mappings().first()

    # Respuesta genérica — no revelar si existe o no el email
    _invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
    )

    if not row:
        raise _invalid

    # 2. Verificar contraseña
    stored_hash = row.get("password_hash")
    if not stored_hash:
        raise _invalid

    try:
        password_ok = bcrypt.checkpw(
            body.password.encode("utf-8"),
            stored_hash.encode("utf-8"),
        )
    except Exception:
        raise _invalid

    if not password_ok:
        raise _invalid

    # 3. Generar JWT
    token = create_access_token({"sub": row["id"], "role": row["role"]})

    return LoginResponse(
        id=row["id"],
        email=row["email"],
        nombre=row["nombre"],
        role=row["role"],
        access_token=token,
    )


# ── Endpoint para validar token y obtener usuario actual ─────────────────────

@router.get("/me")
async def get_me(db: AsyncSession = Depends(get_db), request: Request = None):
    """Valida el JWT del header y retorna el usuario. Usado por el frontend al cargar."""
    from app.auth.deps import get_current_user
    user = await get_current_user(
        credentials=await _extract_credentials(request),
        db=db,
    )
    return user


async def _extract_credentials(request: Request):
    from fastapi.security import HTTPAuthorizationCredentials
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    return None
