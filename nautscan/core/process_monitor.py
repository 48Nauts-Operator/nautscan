import psutil
from typing import Dict, List, Optional
import time
from datetime import datetime

class ProcessMonitor:
    def __init__(self):
        """Initialize the process monitor."""
        self._processes: Dict[int, dict] = {}
        self._ai_process_keywords = ['ollama', 'lmstudio', 'python']
        
    def get_process_info(self, pid: int) -> Optional[dict]:
        """Get detailed information about a specific process."""
        try:
            proc = psutil.Process(pid)
            with proc.oneshot():
                name = proc.name()
                cpu_percent = proc.cpu_percent()
                memory_info = proc.memory_info()
                status = proc.status()
                create_time = datetime.fromtimestamp(proc.create_time()).strftime('%Y-%m-%d %H:%M:%S')
                
                try:
                    connections = proc.connections()
                except (psutil.AccessDenied, psutil.NoSuchProcess):
                    connections = []
                
                return {
                    'pid': pid,
                    'name': name,
                    'cpu_percent': cpu_percent,
                    'memory_rss': memory_info.rss,
                    'memory_vms': memory_info.vms,
                    'status': status,
                    'create_time': create_time,
                    'connections': connections,
                    'is_ai_related': any(keyword in name.lower() for keyword in self._ai_process_keywords)
                }
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            return None
            
    def update_processes(self) -> Dict[int, dict]:
        """Update the list of all running processes."""
        current_processes = {}
        
        for proc in psutil.process_iter(['pid', 'name', 'status']):
            try:
                process_info = self.get_process_info(proc.info['pid'])
                if process_info:
                    current_processes[proc.info['pid']] = process_info
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
                
        self._processes = current_processes
        return self._processes
        
    def get_ai_processes(self) -> Dict[int, dict]:
        """Get all AI-related processes based on name matching."""
        return {pid: info for pid, info in self._processes.items() 
                if info.get('is_ai_related', False)}
                
    def get_process_connections(self, pid: int) -> List[dict]:
        """Get all network connections for a specific process."""
        try:
            proc = psutil.Process(pid)
            connections = []
            for conn in proc.connections():
                if conn.status == 'ESTABLISHED':
                    connections.append({
                        'local_address': conn.laddr,
                        'remote_address': conn.raddr if conn.raddr else None,
                        'status': conn.status,
                        'type': conn.type
                    })
            return connections
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return []
