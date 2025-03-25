from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import logging
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
    from .api.packets import router as packets_router
    logger.info("Successfully imported packets router")
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
    return {"status": "healthy"}

# Include API routers
app.include_router(packets_router, prefix="/api")

logger.info("API router initialized with prefix /api and packets router")
