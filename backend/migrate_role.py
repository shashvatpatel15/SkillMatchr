import asyncio
from sqlalchemy import text
from backend.core.database import engine

async def run():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'hr'"))
            print("Successfully added 'role' column to 'users' table.")
        except Exception as e:
            print("Error or already exists:", e)

if __name__ == "__main__":
    asyncio.run(run())
