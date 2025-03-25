from app.db.session import Base, engine
from app.models.user import UserDB  # Import the user model

def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db() 