# NautScan Troubleshooting Guide

This document provides solutions for common issues you might encounter when running the NautScan application, particularly related to the connections between the frontend and backend components.

## Common API Connection Issues

### 404 Not Found Errors

If you're seeing 404 Not Found errors in the browser console for API endpoints:

1. **Check if the backend service is running:**
   ```bash
   docker ps | grep backend
   ```
   
2. **Verify backend API endpoints are accessible:**
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8000/api/packets/interfaces
   ```

3. **Check backend logs for errors:**
   ```bash
   docker logs webapp_nautscan-backend-1
   ```

### Connection Refused Errors

If you see "Connection refused" errors:

1. **Ensure the backend container is running on the correct port:**
   ```bash
   docker ps | grep backend
   ```

2. **Check if there are port conflicts:**
   ```bash
   netstat -tuln | grep 8000
   ```

3. **Restart the backend container:**
   ```bash
   docker restart webapp_nautscan-backend-1
   ```

## Quick Fix Script

If you're experiencing persistent issues with the frontend-backend connection, run the following script to apply a comprehensive fix:

```bash
#!/bin/bash
# Run this from the project root
./fix_frontend_final.sh
```

## Specific Endpoint Issues

### `/api/packets/interfaces` Not Found

This happens when the backend router isn't properly configured:

1. Check that the router is correctly registered in `main.py`:
   ```python
   app.include_router(packets_router, prefix="/api")
   ```

2. Verify the router is defined with the correct prefix:
   ```python
   router = APIRouter(prefix="/packets", tags=["packets"])
   ```

### `/api/packets/recent` Not Found

If the real-time packet capture isn't working:

1. Check that the router implements the `/recent` endpoint:
   ```python
   @router.get("/recent")
   async def get_recent_packets(limit: int = 20):
       # Implementation
   ```

2. Make sure the implementation returns packet data in the expected format.

### `/api/packets/db` Not Found

If the database mode isn't working:

1. Check that the router implements the `/db` endpoint with filtering:
   ```python
   @router.get("/db")
   async def query_packet_database(
       limit: int = 10,
       offset: int = 0,
       source_ip: Optional[str] = None,
       # Other parameters
   ):
       # Implementation
   ```

## CORS Issues

If you're seeing CORS errors in the console:

1. Ensure the backend has CORS middleware properly configured:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # In production, use specific origins
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. Check that OPTIONS requests are properly handled for POST endpoints.

## Frontend API Configuration

If the frontend can't find the backend API:

1. Create a `.env.local` file in the frontend directory:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

2. Make sure API calls use the environment variable:
   ```javascript
   const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
   ```

## Complete System Reset

If all else fails, perform a complete system reset:

```bash
# Stop and remove all containers
docker compose down --remove-orphans

# Remove any build cache
docker builder prune -f

# Rebuild the images from scratch
docker compose build --no-cache

# Start the services
docker compose up -d

# Wait for services to start
sleep 15

# Verify the services are working
./verify_application.sh
```

## Useful Docker Commands

- **View container logs:**
  ```bash
  docker logs webapp_nautscan-backend-1
  docker logs webapp_nautscan-frontend-1
  ```

- **Exec into a container:**
  ```bash
  docker exec -it webapp_nautscan-backend-1 /bin/bash
  ```

- **Check container network:**
  ```bash
  docker network inspect webapp_nautscan_nautscan-network
  ```

- **Restart individual service:**
  ```bash
  docker restart webapp_nautscan-backend-1
  ``` 