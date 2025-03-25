#!/bin/bash

echo "Restarting NautScan backend service..."
docker restart webapp_nautscan-backend-1

echo "Checking service status..."
docker ps | grep webapp_nautscan-backend

echo "Backend service restarted successfully!"
echo "You can now try using the packet capture feature again." 