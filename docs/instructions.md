Task: Build NautScan – A Network Monitoring & Forensic Security Tool
Objective:
Develop a self-hosted, Dockerized network monitoring tool that:

Design:
- Use a clean, modern design with a focus on usability.
- Dark Theme with a flurozent blue color, cyberpunk style.

Lists all running processes & their outgoing connections.
Captures real-time network traffic & logs outgoing data packets.
Provides a sleek web UI with an interactive 3D world map visualizing connections.
Offers an Advanced Mode with graph-based forensic analysis (similar to crypto forensic tools).
Uses AI for anomaly detection & security insights.
Allows users to toggle external security databases (Tor/VPN detection, ASN lookups).

Core Features:
✅ Real-time process & network tracking (destination IPs, hostnames, protocols).
✅ 3D World Map: Animated real-time visualization of network traffic.
✅ Forensic Mode: Graph-based visual connection mapping.
✅ Threat Alerts: Data breach counter & AI-powered anomaly detection.
✅ Admin Panel: Manage security feeds & blocklists.
✅ Dockerized Deployment: Easy setup with PostgreSQL/Neo4j for data storage.
✅ Mobile-Ready UI: Clean dashboard for alerts & connection monitoring.

Tech Stack:
Backend: FastAPI/Flask (Python) + WebSockets for real-time updates.
Frontend: React/Next.js + Three.js/D3.js for visuals.
Database: PostgreSQL + GraphDB (Neo4j) for forensic investigations.
Networking: Scapy/Pyshark for packet capture.
AI Models: Local LLM (LLaMA/Mistral) for anomaly detection.
Deliverables:
📌 Phase 1: Dockerized backend, API endpoints, and process monitoring.
📌 Phase 2: Frontend dashboard with process logs & connection tracking.
📌 Phase 3: 3D map animation & forensic mode.
📌 Phase 4: AI-powered anomaly detection & external security integrations.

Final Goal:
A fully functional, self-hosted security tool for real-time network monitoring, forensic analysis, and AI-driven anomaly detection.