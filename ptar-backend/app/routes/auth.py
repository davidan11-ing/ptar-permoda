from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from app.database import get_db

router = APIRouter()

class LoginRequest(BaseModel):
    email: str

class UserResponse(BaseModel):
    id: str
    email: str
    nombre: str
    role: str

@router.post("/login", response_model=UserResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT id, email, nombre, role FROM ptar_users WHERE email = :email"),
        {"email": body.email},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return UserResponse(**dict(row))
