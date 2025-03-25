# NautScan - Network & Process Monitor

> **Status: ALPHA** ⚠️
> 
> This project is currently in early alpha stage. While the core functionality is implemented, it may contain bugs and is not recommended for production use.
> 
> ### Known Issues
> - Network capture on macOS requires additional setup
> - Some features may require elevated privileges
> - Performance optimization needed for large-scale deployments
> - UI/UX improvements pending
> 
> ### Development Roadmap
> - [ ] Beta release with core features
> - [ ] Production-ready deployment
> - [ ] Performance optimization
> - [ ] Enhanced security features
> - [ ] User documentation
> 
> ### Contributing to Development
> We welcome contributions! Please see our [Contributing Guidelines](docs/CONTRIBUTING.md) and [Issue Pipeline](docs/ISSUE_PIPELINE.md) for more information.

A comprehensive network and process monitoring application built with modern web technologies. NautScan provides real-time visibility into network traffic, system processes, and resource utilization.

## Features

- **Real-time Network Monitoring**
  - Live packet capture and analysis
  - Connection tracking and visualization
  - Protocol analysis and statistics
  - Geographic traffic visualization

- **Process Monitoring**
  - Real-time process list with details
  - Resource usage per process
  - Process hierarchy visualization
  - System resource monitoring

- **Security Features**
  - Suspicious connection detection
  - Protocol analysis
  - Geographic anomaly detection
  - Alert system for security events

## Tech Stack

### Backend
- Python 3.11+
- FastAPI for REST API
- Scapy for packet capture
- SQLAlchemy for database ORM
- PostgreSQL for relational data
- Neo4j for graph data
- WebSocket support for real-time updates

### Frontend
- React with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Three.js for 3D visualizations
- D3.js for data visualization
- WebSocket client for real-time updates

### Infrastructure
- Docker for containerization
- Docker Compose for service orchestration
- Host network capture support
- macOS-specific optimizations

## Prerequisites

- Docker and Docker Compose
- Python 3.11 or higher
- Node.js 18 or higher
- Git

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/48Nauts-Operator/nautscan.git
cd nautscan
```

2. Start the application using Docker Compose:
```bash
docker compose up -d
```

3. Access the web interface at http://localhost:3003

## Development Setup

### Backend Setup

1. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the backend server:
```bash
uvicorn backend.main:app --reload --port 8000
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. Start the development server:
```bash
npm run dev
```

## Network Capture Setup

### macOS

For macOS users, use the provided capture script:
```bash
./capture_mac.sh
```

This script will:
1. Identify the primary network interface
2. Set up packet capture using tcpdump
3. Start the NautScan containers
4. Configure the capture pipe

### Linux

For Linux systems, the application can directly access network interfaces with appropriate permissions:
```bash
sudo docker compose up -d
```

## Project Structure

```
nautscan/
├── backend/                 # FastAPI backend
│   ├── api/                # API endpoints
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   └── services/      # API services
│   └── public/            # Static assets
├── database/              # Database migrations
│   └── init/             # Initial setup scripts
├── docs/                 # Documentation
└── scripts/              # Utility scripts
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Scapy](https://scapy.net/) for packet capture capabilities
- [FastAPI](https://fastapi.tiangolo.com/) for the modern Python web framework
- [Three.js](https://threejs.org/) for 3D visualization
- [TailwindCSS](https://tailwindcss.com/) for styling
- [D3.js](https://d3js.org/) for data visualization 