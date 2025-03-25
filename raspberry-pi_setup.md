# Setting up NautScan on a Raspberry Pi

This guide walks through the process of setting up NautScan on a Raspberry Pi for network monitoring. A Raspberry Pi is an ideal platform for continuous network monitoring due to its low power consumption, small form factor, and sufficient processing power.

## Hardware Requirements

- **Raspberry Pi 4** (recommended) with at least 2GB RAM (4GB preferred for better performance)
- **MicroSD card** (32GB or larger recommended for packet storage)
- **Power supply** (official 3A USB-C recommended for stability)
- **Ethernet cable**
- **Optional but recommended:**
  - USB Ethernet adapter (for two-interface configurations)
  - Case with cooling (as the Pi will be running continuously)
  - External SSD drive (for extended packet capture storage)

## Software Requirements

- Raspberry Pi OS Lite (Debian-based, 64-bit recommended)
- Docker and Docker Compose
- Git (for cloning the repository)

## Basic Setup

### 1. Install Raspberry Pi OS

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/) on your computer
2. Insert your microSD card into your computer
3. Run the Raspberry Pi Imager and select:
   - OS: Raspberry Pi OS Lite (64-bit)
   - Storage: Your microSD card
   - Advanced options (gear icon):
     - Enable SSH
     - Set a username and password
     - Configure WiFi (if not using Ethernet)
     - Set hostname (e.g., "nautscan-pi")
4. Click "Write" and wait for the process to complete
5. Insert the microSD card into your Raspberry Pi and power it on

### 2. Update the System

Connect to your Raspberry Pi via SSH and update the system:

```bash
ssh pi@nautscan-pi.local
sudo apt update
sudo apt upgrade -y
```

### 3. Install Docker and Docker Compose

```bash
# Install Docker
curl -sSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install dependencies
sudo apt install -y python3-pip git

# Install Docker Compose
sudo pip3 install docker-compose

# Log out and back in for group changes to take effect
logout
```

After logging back in, verify installation:

```bash
docker --version
docker-compose --version
```

### 4. Clone the NautScan Repository

```bash
git clone https://github.com/yourusername/WebApp_Nautscan.git
cd WebApp_Nautscan
```

## Network Configuration Options

NautScan can be set up in different ways depending on your monitoring needs. Choose the option that best suits your requirements.

### Option A: Basic Monitoring (Single Interface)

This is the simplest setup but has limited visibility - you'll only see traffic to/from the Raspberry Pi itself and broadcast traffic.

```bash
# No special configuration needed - just use the built-in Ethernet port
# Connect the Pi to your network via Ethernet
```

Update NautScan's packet capture settings in `backend/app/services/packet_capture.py`:

```python
self.settings = {
    'interface': 'eth0',  # Use your Ethernet interface (may be different)
    'filter': 'tcp or udp',
    'promisc': True,
    'monitor': False,
    # other settings...
}
```

### Option B: Passive Monitoring (with Port Mirroring)

This setup requires a managed switch that supports port mirroring (SPAN).

1. Connect the Pi's Ethernet port to a mirror/SPAN port on your switch
2. Configure your switch to mirror the traffic you want to monitor to this port

Update NautScan's packet capture settings:

```python
self.settings = {
    'interface': 'eth0',
    'filter': 'tcp or udp',
    'promisc': True,
    'monitor': True,
    # other settings...
}
```

### Option C: Inline Bridge (Two Interfaces)

This provides the most comprehensive visibility by placing the Pi between your modem and router.

1. Install a USB Ethernet adapter on your Pi (or use a Pi with two built-in Ethernet ports)
2. Install bridge utilities:

```bash
sudo apt install -y bridge-utils
```

3. Configure the network bridge by editing `/etc/dhcpcd.conf`:

```bash
sudo nano /etc/dhcpcd.conf
```

Add at the bottom:

```
denyinterfaces eth0 eth1
denyinterfaces br0
```

4. Create a new bridge configuration file:

```bash
sudo nano /etc/network/interfaces.d/br0
```

Add:

```
auto br0
iface br0 inet dhcp
  bridge_ports eth0 eth1
  bridge_stp off
  bridge_waitport 0
  bridge_fd 0
```

5. Reboot for changes to take effect:

```bash
sudo reboot
```

6. Update NautScan's packet capture settings:

```python
self.settings = {
    'interface': 'br0',  # Monitor the bridge
    'filter': 'tcp or udp',
    'promisc': True,
    # other settings...
}
```

## Running NautScan

### 1. Configure Docker Compose

Edit the `docker-compose.yml` file if necessary to adjust ports or settings:

```bash
nano docker-compose.yml
```

### 2. Start the Application

```bash
docker-compose up -d
```

### 3. Access the NautScan Interface

Open a web browser and navigate to:

```
http://nautscan-pi.local:3003
```

Replace `nautscan-pi.local` with your Pi's IP address if needed.

## Performance Optimization

### Monitor Resource Usage

```bash
htop
```

### Increase Swap (if needed)

```bash
sudo nano /etc/dphys-swapfile
```

Change `CONF_SWAPSIZE` to a larger value (e.g., 2048 for 2GB):

```
CONF_SWAPSIZE=2048
```

Apply changes:

```bash
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### Configure Storage for Packet Data

For high-volume packet capture, consider using an external SSD:

1. Connect an external SSD to the Raspberry Pi via USB
2. Format and mount the drive:

```bash
sudo mkfs.ext4 /dev/sda1  # Change to your actual device
sudo mkdir /mnt/packet_storage
sudo mount /dev/sda1 /mnt/packet_storage
```

3. Configure for automatic mounting by editing `/etc/fstab`:

```bash
sudo nano /etc/fstab
```

Add:

```
/dev/sda1 /mnt/packet_storage ext4 defaults 0 2
```

4. Update Docker volume in `docker-compose.yml` to store data on the external drive

## Security Considerations

### Secure the Raspberry Pi

1. Change the default password
2. Set up SSH key authentication and disable password login
3. Install and configure a firewall:

```bash
sudo apt install -y ufw
sudo ufw allow ssh
sudo ufw allow 3003  # NautScan web interface
sudo ufw enable
```

### Secure the NautScan Application

1. Set up HTTPS for the web interface
2. Add authentication to the NautScan interface

## Maintenance

### Updating the System

```bash
sudo apt update
sudo apt upgrade -y
```

### Updating NautScan

```bash
cd WebApp_Nautscan
git pull
docker-compose down
docker-compose up -d
```

### Monitoring Logs

```bash
docker-compose logs -f
```

## Troubleshooting

### Check Network Interfaces

```bash
ip addr show
```

### Test Packet Capture

```bash
sudo tcpdump -i eth0 -n
```

### Check Docker Containers

```bash
docker-compose ps
```

### View Container Logs

```bash
docker-compose logs frontend
docker-compose logs backend
```

## Advanced Configuration

### Automated Alerts

Set up alerts for suspicious network activity using the built-in alert system or integrate with external services like Slack or email.

### Remote Access

Configure a secure VPN to access your NautScan instance remotely.

### Traffic Analysis Rules

Customize the detection rules for malicious traffic in the NautScan configuration.

## Conclusion

Your Raspberry Pi is now set up as a dedicated network monitoring appliance with NautScan. The setup you choose (basic, passive with mirroring, or inline bridge) determines the visibility you have into your network. The inline bridge configuration provides the most comprehensive view but requires more careful setup to avoid network disruption.

For additional help, refer to the main NautScan documentation or the Raspberry Pi community forums. 