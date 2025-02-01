from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel,
                             QFrame, QSizePolicy)
from PyQt6.QtCore import Qt
import pyqtgraph as pg
import numpy as np
from datetime import datetime

class ResourceGraph(pg.PlotWidget):
    def __init__(self, title, color="#69db7c"):
        super().__init__()
        self.setBackground('w')
        self.setTitle(title, color='k', size='12pt')
        self.showGrid(x=True, y=True)
        self.setLabel('left', 'Percentage', color='k')
        self.setLabel('bottom', 'Time (s)', color='k')
        self.addLegend()
        
        # Store data
        self.times = np.array([])
        self.values = np.array([])
        self.max_points = 60  # 1 minute of data
        
        # Create plot
        self.plot = self.plot(self.times, self.values, pen=color, name=title)
        
    def update_data(self, value):
        """Update the graph with new data."""
        current_time = datetime.now().timestamp()
        
        if len(self.times) == 0:
            self.times = np.array([current_time])
            self.values = np.array([value])
        else:
            self.times = np.append(self.times, current_time)
            self.values = np.append(self.values, value)
            
            # Remove old data points
            if len(self.times) > self.max_points:
                self.times = self.times[-self.max_points:]
                self.values = self.values[-self.max_points:]
                
        # Update plot
        times_normalized = self.times - self.times[0]  # Normalize to start from 0
        self.plot.setData(times_normalized, self.values)
        
class ResourceView(QWidget):
    def __init__(self, resource_monitor):
        super().__init__()
        self.resource_monitor = resource_monitor
        self._setup_ui()
        
    def _setup_ui(self):
        """Setup the resource view UI."""
        layout = QVBoxLayout(self)
        
        # Create graphs
        graphs_layout = QHBoxLayout()
        
        # CPU Graph
        self.cpu_graph = ResourceGraph("CPU Usage", "#ff6b6b")
        graphs_layout.addWidget(self.cpu_graph)
        
        # Memory Graph
        self.memory_graph = ResourceGraph("Memory Usage", "#4dabf7")
        graphs_layout.addWidget(self.memory_graph)
        
        layout.addLayout(graphs_layout)
        
        # Add resource info panels
        info_layout = QHBoxLayout()
        
        # CPU Info
        self.cpu_info = ResourceInfoPanel("CPU")
        info_layout.addWidget(self.cpu_info)
        
        # Memory Info
        self.memory_info = ResourceInfoPanel("Memory")
        info_layout.addWidget(self.memory_info)
        
        # Disk Info
        self.disk_info = ResourceInfoPanel("Disk")
        info_layout.addWidget(self.disk_info)
        
        # Network Info
        self.network_info = ResourceInfoPanel("Network")
        info_layout.addWidget(self.network_info)
        
        # GPU Info (if available)
        self.gpu_info = ResourceInfoPanel("GPU")
        info_layout.addWidget(self.gpu_info)
        
        layout.addLayout(info_layout)
        
    def update_stats(self, stats):
        """Update the resource view with new statistics."""
        # Update graphs
        self.cpu_graph.update_data(stats['cpu']['percent'])
        self.memory_graph.update_data(stats['memory']['percent'])
        
        # Update info panels
        self._update_cpu_info(stats['cpu'])
        self._update_memory_info(stats['memory'])
        self._update_disk_info(stats['disk'])
        self._update_network_info(stats['network'])
        if stats['gpu']:
            self._update_gpu_info(stats['gpu'])
            self.gpu_info.setVisible(True)
        else:
            self.gpu_info.setVisible(False)
            
    def _update_cpu_info(self, cpu_stats):
        """Update CPU information panel."""
        info = [
            f"Usage: {cpu_stats['percent']:.1f}%",
            "Per Core:",
        ]
        for i, core in enumerate(cpu_stats['per_cpu']):
            info.append(f"Core {i}: {core:.1f}%")
        self.cpu_info.update_info(info)
        
    def _update_memory_info(self, memory_stats):
        """Update memory information panel."""
        total_gb = memory_stats['total'] / (1024**3)
        used_gb = memory_stats['used'] / (1024**3)
        free_gb = memory_stats['free'] / (1024**3)
        
        info = [
            f"Total: {total_gb:.1f} GB",
            f"Used: {used_gb:.1f} GB",
            f"Free: {free_gb:.1f} GB",
            f"Usage: {memory_stats['percent']:.1f}%"
        ]
        self.memory_info.update_info(info)
        
    def _update_disk_info(self, disk_stats):
        """Update disk information panel."""
        total_gb = disk_stats['total'] / (1024**3)
        used_gb = disk_stats['used'] / (1024**3)
        free_gb = disk_stats['free'] / (1024**3)
        
        info = [
            f"Total: {total_gb:.1f} GB",
            f"Used: {used_gb:.1f} GB",
            f"Free: {free_gb:.1f} GB",
            f"Usage: {disk_stats['percent']:.1f}%"
        ]
        self.disk_info.update_info(info)
        
    def _update_network_info(self, network_stats):
        """Update network information panel."""
        sent_mb = network_stats['bytes_sent'] / (1024**2)
        recv_mb = network_stats['bytes_recv'] / (1024**2)
        
        info = [
            f"Sent: {sent_mb:.1f} MB",
            f"Received: {recv_mb:.1f} MB"
        ]
        self.network_info.update_info(info)
        
    def _update_gpu_info(self, gpu_stats):
        """Update GPU information panel."""
        total_gb = gpu_stats['total'] / (1024**3)
        used_gb = gpu_stats['used'] / (1024**3)
        free_gb = gpu_stats['free'] / (1024**3)
        
        info = [
            f"Total: {total_gb:.1f} GB",
            f"Used: {used_gb:.1f} GB",
            f"Free: {free_gb:.1f} GB",
            f"Usage: {gpu_stats['percent']:.1f}%"
        ]
        self.gpu_info.update_info(info)
        
class ResourceInfoPanel(QFrame):
    def __init__(self, title):
        super().__init__()
        self.setFrameStyle(QFrame.Shape.StyledPanel | QFrame.Shadow.Raised)
        self.setSizePolicy(QSizePolicy.Policy.Preferred, QSizePolicy.Policy.Preferred)
        
        layout = QVBoxLayout(self)
        
        # Title
        title_label = QLabel(title)
        title_label.setStyleSheet("font-weight: bold; font-size: 14px;")
        layout.addWidget(title_label)
        
        # Info content
        self.info_label = QLabel()
        self.info_label.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignTop)
        layout.addWidget(self.info_label)
        
    def update_info(self, info_lines):
        """Update the information displayed in the panel."""
        self.info_label.setText('\n'.join(info_lines))
