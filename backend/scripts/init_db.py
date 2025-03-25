import asyncio
import logging
from pathlib import Path
import sys

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.db.session import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init():
    logger.info("Creating database tables...")
    await init_db()
    logger.info("Database tables created successfully!")

def main():
    """Initialize the database"""
    try:
        asyncio.run(init())
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 