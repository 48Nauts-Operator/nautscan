import psutil
from typing import List, Dict, Optional
from datetime import datetime
import logging
from uuid import uuid4

logger = logging.getLogger(__name__)

class ProcessMonitor:
    """Process monitoring service."""

    def __init__(self):
        """Initialize the process monitor."""
        self.process_cache = {}

    def get_all_processes(self) -> List[Dict]:
        """Get all running processes."""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent']):
            try:
                pinfo = proc.info
                processes.append({
                    'pid': pinfo['pid'],
                    'name': pinfo['name'],
                    'username': pinfo['username'],
                    'cpu_percent': pinfo['cpu_percent'] or 0.0,
                    'memory_percent': pinfo['memory_percent'] or 0.0
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        return processes

    def get_process_by_pid(self, pid: int) -> Optional[Dict]:
        """Get detailed information about a specific process."""
        try:
            proc = psutil.Process(pid)
            return {
                'pid': proc.pid,
                'name': proc.name(),
                'username': proc.username(),
                'cpu_percent': proc.cpu_percent(),
                'memory_percent': proc.memory_percent(),
                'status': proc.status(),
                'create_time': proc.create_time(),
                'cmdline': proc.cmdline(),
                'num_threads': proc.num_threads()
            }
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            return None

    def get_process_network_connections(self, pid: int) -> List[Dict]:
        """Get network connections for a specific process."""
        try:
            proc = psutil.Process(pid)
            connections = []
            for conn in proc.connections():
                connections.append({
                    'fd': conn.fd,
                    'family': str(conn.family),
                    'type': str(conn.type),
                    'local_address': conn.laddr._asdict() if conn.laddr else None,
                    'remote_address': conn.raddr._asdict() if conn.raddr else None,
                    'status': conn.status
                })
            return connections
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            return []

    def get_system_resources(self) -> Dict:
        """Get system resource usage."""
        return {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory': dict(psutil.virtual_memory()._asdict()),
            'disk': dict(psutil.disk_usage('/')._asdict()),
            'network': dict(psutil.net_io_counters()._asdict()),
            'process_count': len(list(psutil.process_iter()))
        } 