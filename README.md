# NautScan - Network & Process Monitor

A lightweight monitoring application that tracks running processes, network activity, and system resources with a focus on identifying potential data breaches from AI-related applications.

## Features

* **Process Monitoring**  
   * List all running processes with detailed information  
   * Identify AI-related processes (Ollama, LM Studio, etc.)  
   * Track process resource usage
* **Network Connection Tracking**  
   * Monitor outgoing network connections  
   * Identify external vs. local connections  
   * Real-time connection logging  
   * DNS resolution for remote hosts
* **Resource Monitoring**  
   * Real-time CPU usage graphs  
   * Memory utilization tracking  
   * Disk usage statistics  
   * Network traffic monitoring  
   * GPU monitoring (if available)
* **Security Features**  
   * Data breach counter  
   * Visual security status indicator  
   * Detailed connection logging  
   * Process filtering capabilities

## Docker Setup

The application is containerized using Docker Compose for easy deployment. There are two ways to run NautScan:

### 1. Standard Docker Setup

```bash
# Clone the repository
git clone https://github.com/48Nauts-Operator/nautscan.git
cd nautscan

# Start the containers
docker compose up -d

# Access the web interface at http://localhost:3003
```

### 2. Host Network Capture (macOS)

For capturing actual host network traffic on macOS:

```bash
# Clone the repository
git clone https://github.com/48Nauts-Operator/nautscan.git
cd nautscan

# Make the capture script executable
chmod +x capture_mac.sh

# Run the capture script (requires sudo for tcpdump)
./capture_mac.sh

# Access the web interface at http://localhost:3003
```

The script will:
1. Find your primary network interface (e.g., en0)
2. Start tcpdump to capture real network traffic
3. Feed the captured packets to the NautScan container
4. Start all necessary services

## Architecture

The application consists of several containerized services:

- **Frontend**: React/Next.js web interface (port 3003)
- **Backend**: FastAPI Python service (port 8001)
- **PostgreSQL**: Database for packet storage
- **Neo4j**: Graph database for connection analysis

## Development Setup

1. Create a virtual environment (recommended):  
```bash
python -m venv venv  
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:  
```bash
pip install -r requirements.txt
```

## Requirements

* Docker and Docker Compose
* Python 3.8+ (for development)
* Sudo access (for host network capture)
* Additional requirements listed in `requirements.txt`

## Note

Some features may require elevated privileges to access system information:

* On Linux/macOS: Run with `sudo` or grant necessary permissions
* On Windows: Run as Administrator

## License

MIT License - See LICENSE file for details 