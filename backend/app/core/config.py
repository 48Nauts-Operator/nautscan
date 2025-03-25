from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings."""
    # API settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "NautScan"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Network monitoring and packet analysis API"

    # CORS settings
    BACKEND_CORS_ORIGINS: list = ["*"]

    # Security settings
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database settings
    DATABASE_URL: str = "sqlite:///./nautscan.db"

    # Neo4j settings
    NEO4J_URI: Optional[str] = None
    NEO4J_USER: Optional[str] = None
    NEO4J_PASSWORD: Optional[str] = None

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings() 