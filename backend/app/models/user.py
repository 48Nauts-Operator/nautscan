from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from pydantic import BaseModel, EmailStr
from app.db.session import Base

# SQLAlchemy model
class UserDB(Base):
    """User database model."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic models
class UserBase(BaseModel):
    """Base user schema."""
    username: str
    email: EmailStr

class UserCreate(UserBase):
    """User creation schema."""
    password: str

class UserLogin(BaseModel):
    """User login schema."""
    username: str
    password: str

class User(UserBase):
    """User schema."""
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 