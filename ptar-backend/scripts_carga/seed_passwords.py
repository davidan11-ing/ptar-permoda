"""
Seed passwords for existing users.
Run: python -m scripts_carga.seed_passwords
"""
import asyncio
from sqlalchemy import text
from app.database import SessionLocal
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

USERS = [
    ("davidan@permoda.com.co", "admin123"),
    ("encargado@permoda.com.co", "encargado123"),
    ("operario@permoda.com.co", "operario123"),
]

async def main():
    async with SessionLocal() as session:
        for email, password in USERS:
            hash_val = pwd_context.hash(password)
            await session.execute(
                text("UPDATE ptar_users SET password_hash = :hash WHERE email = :email"),
                {"hash": hash_val, "email": email},
            )
        await session.commit()
        print("Passwords seeded successfully")
        print("Credentials:")
        for email, password in USERS:
            print(f"  {email} / {password}")

if __name__ == "__main__":
    asyncio.run(main())
