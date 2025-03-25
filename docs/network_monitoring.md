# NautScan Network Monitoring Guide

This guide explains how to configure NautScan to effectively monitor network traffic on your system or network.

## Understanding NautScan's Network Monitoring Capability

NautScan provides two primary modes for monitoring network traffic:

1. **Host Interface Monitoring**: Captures traffic flowing through the network interfaces of the host machine.
2. **Network-Wide Monitoring**: Captures traffic from the wider network when properly configured with promiscuous mode and appropriate network positioning.

## Docker Network Limitations

By default, Docker containers can only see their own network interfaces and traffic:
- `lo` (127.0.0.1) - Container's loopback interface
- `eth0` (typically 172.x.x.x) - Container's virtual network interface

This limits NautScan's ability to see your actual network traffic.

## Enabling Host Network Access

To give NautScan access to your host machine's network interfaces:

1. **Use Host Network Mode**: Configure Docker to use the host's network namespace.
   ```yaml
   services:
     backend:
       network_mode: "host"
       cap_add:
         - NET_ADMIN
         - NET_RAW
   ```

2. **Required Capabilities**:
   - `NET_ADMIN`: Required for interface configuration
   - `NET_RAW`: Required for raw packet access
   - `privileged: true`: May be required for full network access

3. **Run the Setup Script**:
   ```bash
   ./host_network_fix.sh
   ```
   This script reconfigures Docker and updates the packet capture implementation.

## Optimal Network Monitoring Setup

For comprehensive network monitoring, consider these setups:

### Option 1: NautScan on a Direct Network Connection

Place NautScan on a machine connected directly to your router or modem:

```
Internet --> Modem --> [NautScan Host] --> Router --> Your Devices
```

This setup allows NautScan to see all traffic entering and leaving your network.

### Option 2: Promiscuous Mode at a Network Choke Point

Place NautScan at a network choke point with promiscuous mode enabled:

```
Internet --> Modem --> Switch (with port mirroring) --> Your Devices
                           |
                      [NautScan Host]
```

Configure your switch for port mirroring (SPAN) to send a copy of all traffic to NautScan.

### Option 3: Dedicated Network Tap

Use a hardware network tap to non-intrusively monitor traffic:

```
Internet --> Modem --> Network Tap --> Router --> Your Devices
                           |
                      [NautScan Host]
```

A network tap provides a copy of the traffic without affecting network performance.

## Enabling Promiscuous Mode

Promiscuous mode allows a network interface to capture all packets, not just those addressed to it:

1. **In NautScan**:
   Promiscuous mode is enabled by default in the updated configuration.

2. **On your host system**:
   ```bash
   sudo ip link set <interface> promisc on
   # Example: sudo ip link set eth0 promisc on
   ```

3. **On a virtual machine**:
   Enable promiscuous mode in your VM software settings.

## Troubleshooting

If you're not seeing the expected network interfaces or traffic:

1. **Check Docker Privileges**:
   ```bash
   docker info | grep Security
   ```
   Ensure Docker can access host capabilities.

2. **Verify Interface Visibility**:
   ```bash
   curl http://localhost:8000/api/packets/interfaces
   ```
   Check if your physical interfaces are listed.

3. **Test Packet Capture**:
   ```bash
   curl -X POST -H "Content-Type: application/json" -d '{"interface":"your_interface"}' http://localhost:8000/api/packets/start
   curl http://localhost:8000/api/packets/recent
   ```
   Verify packets are being captured.

4. **Common Issues**:
   - **No host interfaces visible**: Docker may not have sufficient privileges
   - **No traffic captured**: Promiscuous mode may not be working
   - **Only seeing container traffic**: Ensure host network mode is active

## Security Considerations

Be aware of these security implications:

1. **Privileged Container Risks**: Running containers with host network access introduces security risks.
2. **Data Privacy**: Network monitoring may capture sensitive information.
3. **Legal Compliance**: Ensure you have permission to monitor the network.

Always use NautScan responsibly and only on networks you have permission to monitor. 