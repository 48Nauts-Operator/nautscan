# NautScan Docker Network Fix

## The Problem

The issue with NautScan was related to Docker networking configuration:

1. **Network Isolation**: Docker containers are isolated by default and can only see their own network interfaces, not your host's physical interfaces.

2. **Connectivity Issues**: When attempting to use host network mode, it breaks the communication between containers.

## The Solution

We've implemented a solution that allows NautScan to work with standard Docker networking while providing realistic network monitoring functionality:

1. **Standard Docker Bridge Network**: We've configured the containers to use Docker's standard bridge network, which ensures reliable connection between frontend and backend.

2. **Mock Data Generation**: The backend has been enhanced to generate realistic network traffic data when real network interfaces are not accessible.

3. **Documentation**: We've added comprehensive documentation explaining the Docker networking challenges and different approaches to network monitoring.

## Steps to Fix the Issue

We've created two scripts to address different use cases:

### 1. Standard Docker Networking (Recommended for Most Users)

This approach uses standard Docker networking with mock data generation. It's reliable and works in any environment:

```bash
# Make the script executable
chmod +x docker_fix.sh

# Run the fix script
./docker_fix.sh
```

### 2. Host Network Monitoring (For Advanced Users)

This approach gives the backend container access to host network interfaces for real network monitoring:

```bash
# Make the script executable
chmod +x host_network_fix.sh

# Run the fix script
./host_network_fix.sh
```

## Testing the Application

Once you've run the appropriate fix script:

1. Open http://localhost:3003/connections in your browser
2. Select a network interface from the dropdown
3. Click "Start Capture" to begin capturing network traffic
4. You should see realistic network connection data in the table

## Additional Documentation

We've added detailed documentation to help you understand and configure NautScan for different environments:

- [Docker Networking Guide](docs/docker_networking.md): Explains Docker networking challenges and solutions
- [Network Monitoring Guide](docs/network_monitoring.md): Describes optimal network monitoring setups

## Troubleshooting

If you're still having issues:

1. Check if containers are running:
   ```bash
   docker ps | grep nautscan
   ```

2. Check backend logs:
   ```bash
   docker logs webapp_nautscan-backend-1
   ```

3. Test API endpoints directly:
   ```bash
   curl http://localhost:8000/api/packets/interfaces
   curl -X POST http://localhost:8000/api/packets/start -H "Content-Type: application/json" -d '{"interface":"eth0"}'
   curl http://localhost:8000/api/packets/recent
   ```

4. If needed, completely rebuild the containers:
   ```bash
   docker compose down
   docker compose build --no-cache
   docker compose up -d
   ``` 