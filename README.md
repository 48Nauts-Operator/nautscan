# NautScan - Network & Process Monitor

A lightweight monitoring application that tracks running processes, network activity, and system resources with a focus on identifying potential data breaches from AI-related applications.

## Features

- **Process Monitoring**
  - List all running processes with detailed information
  - Identify AI-related processes (Ollama, LM Studio, etc.)
  - Track process resource usage

- **Network Connection Tracking**
  - Monitor outgoing network connections
  - Identify external vs. local connections
  - Real-time connection logging
  - DNS resolution for remote hosts

- **Resource Monitoring**
  - Real-time CPU usage graphs
  - Memory utilization tracking
  - Disk usage statistics
  - Network traffic monitoring
  - GPU monitoring (if available)

- **Security Features**
  - Data breach counter
  - Visual security status indicator
  - Detailed connection logging
  - Process filtering capabilities

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/nautscan.git
   cd nautscan
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. Start the application:
   ```bash
   python main.py
   ```

2. The main window will open with three tabs:
   - **Processes**: View and filter running processes
   - **Network**: Monitor network connections and view connection logs
   - **Resources**: Track system resource usage with real-time graphs

3. The top status bar shows:
   - Number of external connections
   - Security status indicator:
     - 🟢 Green: No suspicious connections
     - 🟠 Orange: Some external connections detected
     - 🔴 Red: Multiple external connections (potential security risk)

## Requirements

- Python 3.8+
- PyQt6
- psutil
- scapy
- pyqtgraph
- numpy
- Additional requirements listed in `requirements.txt`

## Note

Some features may require elevated privileges to access system information:
- On Linux/macOS: Run with `sudo` or grant necessary permissions
- On Windows: Run as Administrator

## License

MIT License - See LICENSE file for details 