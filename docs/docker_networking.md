# Docker Networking and NautScan

This document explains the Docker networking challenges when using NautScan and presents different approaches to address them.

## Understanding the Issue

When running NautScan in Docker containers, there are two key networking challenges:

1. **Network Isolation**: By default, Docker containers run in their own isolated network namespace, which means they can only see their own virtual network interfaces (`lo`, `eth0`, etc.) and not the host's physical interfaces.

2. **Container Accessibility**: When using `network_mode: "host"` to address problem #1, it creates a new issue where other containers can't reach the host-networked container using Docker's internal DNS resolution.

## Available Approaches

### Approach 1: Standard Docker Networking with Mock Data

This approach uses Docker's standard bridge networking model but provides mock network data for demonstration.

**Setup**:
- Standard `docker-compose.yml` with bridge networking
- All containers can communicate via service names
- Interface data and packet capture are simulated

**Benefits**:
- Simple configuration
- Works on any Docker setup without special privileges
- Reliable container-to-container communication

**Limitations**:
- Cannot see or capture real network traffic
- Only for demonstration/development purposes

**Configuration**:
```yaml
services:
  backend:
    # ... other config
    ports:
      - "8000:8000"
    networks:
      - nautscan-network
  
  frontend:
    # ... other config
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api
    networks:
      - nautscan-network
```

**To implement this approach**:
```bash
./docker_fix.sh
```

### Approach 2: Host Network Mode for Real Network Monitoring

This approach uses the host's network namespace for the backend container, allowing real network monitoring.

**Setup**:
- Backend uses `network_mode: "host"`
- Backend has access to host network interfaces
- Frontend must access backend via localhost, not service name

**Benefits**:
- Can see and monitor real network traffic
- Access to all host network interfaces
- Real packet capture capability

**Limitations**:
- Requires Docker privileges (`NET_ADMIN`, `NET_RAW`)
- Frontend must use localhost to access backend
- Not as portable across environments

**Configuration**:
```yaml
services:
  backend:
    # ... other config
    network_mode: "host"
    cap_add:
      - NET_ADMIN
      - NET_RAW
    privileged: true
  
  frontend:
    # ... other config
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**To implement this approach**:
```bash
./host_network_fix.sh
```

### Approach 3: Hybrid Approach with Macvlan/IPvlan

For advanced use cases, you can create a macvlan or ipvlan network that gives containers their own MAC/IP addresses on the physical network.

**Setup**:
- Create macvlan network connected to physical interface
- Assign containers direct IPs on your network
- Requires network configuration and may need router changes

**Benefits**:
- Containers appear as separate devices on network
- Can monitor real traffic
- Good isolation between components

**Limitations**:
- Complex setup
- Requires network knowledge
- May not work in all environments (e.g., some cloud providers)

**This is an advanced configuration not covered by the provided scripts.**

## Current Implementation

The current implementation follows **Approach 1**, providing a demonstration-focused solution that works reliably in any Docker environment. The packet capture functionality generates realistic mock data to demonstrate the application's capabilities.

For real network monitoring in production, please follow the guidance in [network_monitoring.md](network_monitoring.md) to set up a proper monitoring environment. 