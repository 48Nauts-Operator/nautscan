#!/bin/bash

# This script sets up packet capture directly on the host machine
# and feeds the packets to the backend container via a named pipe

# Find the primary network interface (e.g., en0 on Mac)
PRIMARY_INTERFACE=$(ifconfig | grep -E '^en' | head -1 | cut -d: -f1)

# Check if interface was found
if [ -z "$PRIMARY_INTERFACE" ]; then
  echo "No primary network interface found, using en0 as default"
  PRIMARY_INTERFACE="en0"
fi

echo "Using network interface $PRIMARY_INTERFACE"

# Create a directory for the named pipe if it doesn't exist
mkdir -p /tmp/nautscan_capture

# Create a named pipe if it doesn't exist
PIPE_PATH="/tmp/nautscan_capture/packets.pcap"
if [ ! -p "$PIPE_PATH" ]; then
  rm -f "$PIPE_PATH"
  mkfifo "$PIPE_PATH"
fi

# Start tcpdump in the background
echo "Starting tcpdump on $PRIMARY_INTERFACE"
sudo tcpdump -i "$PRIMARY_INTERFACE" -U -w "$PIPE_PATH" &
TCPDUMP_PID=$!

# Add the named pipe volume to docker-compose.yml
echo "Updating docker-compose.yml to mount named pipe..."
sed -i.bak 's#- ./backend:/app#- ./backend:/app\n      - '$PIPE_PATH':/app/host_capture.pcap#' docker-compose.yml

# Set the environment variable for host capture
sed -i.bak 's/HOST_NETWORK=true/HOST_NETWORK=true\n      - HOST_CAPTURE_FILE=\/app\/host_capture.pcap/' docker-compose.yml

# Start the containers
echo "Starting containers..."
docker compose up -d

echo "NautScan is now set up to capture traffic from your host network interface ($PRIMARY_INTERFACE)"
echo "Access the web interface at http://localhost:3003"
echo "To stop packet capture, press Ctrl+C"

# Trap to clean up when the script is interrupted
trap "echo 'Stopping packet capture...'; kill $TCPDUMP_PID; rm -f $PIPE_PATH; docker compose down" INT TERM EXIT

# Wait for interrupt
echo "Press Ctrl+C to stop"
wait $TCPDUMP_PID 