import asyncio
import aiomysql
import sys

MYSQL = dict(
    host="127.0.0.1",
    port=3306,
    user="root",
    password="Santia*34",
    charset="utf8mb4",
    autocommit=True
)

async def main():
    print("Testing connection to MySQL local...")
    try:
        conn = await aiomysql.connect(**MYSQL)
        print("[OK] Connected to MySQL server successfully!")
    except Exception as e:
        print(f"[ERROR] Failed to connect to MySQL: {e}", file=sys.stderr)
        return

    try:
        async with conn.cursor() as cur:
            await cur.execute("SHOW DATABASES;")
            dbs = [row[0] for row in await cur.fetchall()]
            print(f"Databases: {dbs}")

            if "ptar_permoda" in dbs:
                print("[OK] Database 'ptar_permoda' exists!")
                await cur.execute("USE ptar_permoda;")
                await cur.execute("SHOW TABLES;")
                tables = [row[0] for row in await cur.fetchall()]
                print(f"Tables in 'ptar_permoda': {tables}")
                
                for table in tables:
                    try:
                        await cur.execute(f"SELECT COUNT(*) FROM {table}")
                        (cnt,) = await cur.fetchone()
                        print(f"  - {table}: {cnt} rows")
                    except Exception as te:
                        print(f"  - {table}: error counting rows: {te}")
            else:
                print("[ERROR] Database 'ptar_permoda' DOES NOT EXIST!")
    finally:
        conn.close()

if __name__ == "__main__":
    asyncio.run(main())
