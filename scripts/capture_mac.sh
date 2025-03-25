#!/bin/bash

# This script captures network traffic on macOS and feeds it to the NautScan container

# Find the primary network interface
PRIMARY_INTERFACE=$(ifconfig | grep -E '^en' | head -1 | cut -d: -f1)
if [ -z "$PRIMARY_INTERFACE" ]; then
    echo "No primary network interface found"
    exit 1
fi

echo "Using network interface: $PRIMARY_INTERFACE"

# Create a named pipe for packet capture
PIPE_DIR="/tmp/nautscan"
PIPE_PATH="$PIPE_DIR/capture.pcap"

mkdir -p "$PIPE_DIR"
rm -f "$PIPE_PATH"
mkfifo "$PIPE_PATH"

# Start tcpdump in the background
echo "Starting packet capture on $PRIMARY_INTERFACE..."
sudo tcpdump -i "$PRIMARY_INTERFACE" -w "$PIPE_PATH" -U &
TCPDUMP_PID=$!

# Function to clean up
cleanup() {
    echo "Stopping packet capture..."
    sudo kill $TCPDUMP_PID
    rm -f "$PIPE_PATH"
    docker compose down
    exit 0
}

# Set up cleanup on script exit
trap cleanup INT TERM EXIT

# Update docker-compose.yml to mount the pipe
cat > docker-compose.yml << EOL
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    privileged: true
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      - ./backend:/app
      - $PIPE_PATH:/app/capture.pcap
    environment:
      - DATABASE_URL=postgresql+asyncpg://nautscan:nautscan@postgres:5432/nautscan
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USER=neo4j
      - NEO4J_PASSWORD=nautscan
      - PORT=8001
      - HOST_CAPTURE_FILE=/app/capture.pcap
    command: uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
    depends_on:
      - postgres
      - neo4j
    networks:
      - default

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile-dev
    ports:
      - "3003:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8001/api
    depends_on:
      - backend
    networks:
      - default

  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=nautscan
      - POSTGRES_PASSWORD=nautscan
      - POSTGRES_DB=nautscan
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - default

  neo4j:
    image: neo4j:latest
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/nautscan
    volumes:
      - neo4j_data:/data
    networks:
      - default

volumes:
  postgres_data:
  neo4j_data:
EOL

# Start the containers
echo "Starting containers..."
docker compose up -d

echo "NautScan is now capturing traffic from $PRIMARY_INTERFACE"
echo "Access the web interface at http://localhost:3003"
echo "Press Ctrl+C to stop"

# Wait for tcpdump to finish
wait $TCPDUMP_PID 