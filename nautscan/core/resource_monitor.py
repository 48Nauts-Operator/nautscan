import psutil
import threading
import time
from typing import Dict, List, Optional, Callable
from datetime import datetime

class ResourceMonitor:
    def __init__(self, update_interval: float = 1.0):
        """Initialize the resource monitor.
        
        Args:
            update_interval: Time between updates in seconds
        """
        self._update_interval = update_interval
        self._stop_monitoring = threading.Event()
        self._monitor_thread: Optional[threading.Thread] = None
        self._callback: Optional[Callable] = None
        self._history_length = 60  # Keep 60 seconds of history
        self._history: List[Dict] = []
        
    def start_monitoring(self, callback: Optional[Callable] = None):
        """Start resource monitoring in a separate thread."""
        self._callback = callback
        self._stop_monitoring.clear()
        self._monitor_thread = threading.Thread(target=self._monitor_resources)
        self._monitor_thread.daemon = True
        self._monitor_thread.start()
        
    def stop_monitoring(self):
        """Stop resource monitoring."""
        self._stop_monitoring.set()
        if self._monitor_thread:
            self._monitor_thread.join()
            
    def _monitor_resources(self):
        """Monitor system resources continuously."""
        while not self._stop_monitoring.is_set():
            stats = self.get_current_stats()
            self._history.append(stats)
            
            # Keep only the last history_length entries
            if len(self._history) > self._history_length:
                self._history = self._history[-self._history_length:]
                
            if self._callback:
                self._callback(stats)
                
            time.sleep(self._update_interval)
            
    def get_current_stats(self) -> Dict:
        """Get current system resource statistics."""
        cpu_percent = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        try:
            # Try to get GPU information if available
            gpu_info = self._get_gpu_info()
        except:
            gpu_info = None
            
        return {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'cpu': {
                'percent': cpu_percent,
                'per_cpu': psutil.cpu_percent(interval=None, percpu=True)
            },
            'memory': {
                'total': memory.total,
                'available': memory.available,
                'percent': memory.percent,
                'used': memory.used,
                'free': memory.free
            },
            'disk': {
                'total': disk.total,
                'used': disk.used,
                'free': disk.free,
                'percent': disk.percent
            },
            'gpu': gpu_info,
            'network': {
                'bytes_sent': psutil.net_io_counters().bytes_sent,
                'bytes_recv': psutil.net_io_counters().bytes_recv
            }
        }
        
    def _get_gpu_info(self) -> Optional[Dict]:
        """Try to get GPU information using nvidia-smi if available."""
        try:
            import pynvml
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            return {
                'total': info.total,
                'used': info.used,
                'free': info.free,
                'percent': (info.used / info.total) * 100
            }
        except:
            return None
            
    def get_history(self) -> List[Dict]:
        """Get resource usage history."""
        return self._history
        
    def get_average_usage(self) -> Dict:
        """Calculate average resource usage over the history period."""
        if not self._history:
            return {}
            
        cpu_percentages = [entry['cpu']['percent'] for entry in self._history]
        memory_percentages = [entry['memory']['percent'] for entry in self._history]
        
        return {
            'cpu_avg': sum(cpu_percentages) / len(cpu_percentages),
            'memory_avg': sum(memory_percentages) / len(memory_percentages)
        }
