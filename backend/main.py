import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Import API routers
try:
    from app.api.packets import router as packets_router
except ImportError as e:
    logger.error(f"Failed to import packets router: {e}")
    # Create a temporary router if import fails
    from fastapi import APIRouter
    packets_router = APIRouter(prefix="/packets", tags=["packets"])

# Create FastAPI application
app = FastAPI(
    title="NautScan API",
    description="Network packet capture and analysis API",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, you should specify the exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to NautScan API"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Include API routers with proper prefix
PREFIX = "/api"
app.include_router(packets_router, prefix=PREFIX)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
