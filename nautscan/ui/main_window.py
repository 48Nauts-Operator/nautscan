from PyQt6.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
                             QTabWidget, QLabel, QPushButton)
from PyQt6.QtCore import Qt, QTimer
from ..core.process_monitor import ProcessMonitor
from ..core.network_monitor import NetworkMonitor
from ..core.resource_monitor import ResourceMonitor
from .process_table import ProcessTable
from .network_view import NetworkView
from .resource_view import ResourceView

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("NautScan - Network & Process Monitor")
        self.setMinimumSize(1200, 800)
        
        # Initialize monitors
        self.process_monitor = ProcessMonitor()
        self.network_monitor = NetworkMonitor()
        self.resource_monitor = ResourceMonitor()
        
        # Setup UI
        self._setup_ui()
        
        # Start monitoring
        self._start_monitoring()
        
    def _setup_ui(self):
        """Setup the main UI components."""
        # Create central widget and main layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        
        # Create status bar at the top
        self._setup_status_bar(main_layout)
        
        # Create tab widget
        tabs = QTabWidget()
        main_layout.addWidget(tabs)
        
        # Process tab
        self.process_table = ProcessTable(self.process_monitor)
        tabs.addTab(self.process_table, "Processes")
        
        # Network tab
        self.network_view = NetworkView(self.network_monitor)
        tabs.addTab(self.network_view, "Network")
        
        # Resource tab
        self.resource_view = ResourceView(self.resource_monitor)
        tabs.addTab(self.resource_view, "Resources")
        
    def _setup_status_bar(self, layout):
        """Setup the status bar with breach counter and shield indicator."""
        status_layout = QHBoxLayout()
        
        # Breach counter
        self.breach_counter = QLabel("External Connections: 0")
        self.breach_counter.setStyleSheet("font-weight: bold; font-size: 14px;")
        status_layout.addWidget(self.breach_counter)
        
        # Shield status
        self.shield_status = QLabel("🟢")
        self.shield_status.setStyleSheet("font-size: 20px;")
        status_layout.addWidget(self.shield_status)
        
        # Stretch to push items to the left
        status_layout.addStretch()
        
        layout.addLayout(status_layout)
        
    def _start_monitoring(self):
        """Start all monitoring components."""
        # Start process monitoring
        self.process_monitor.update_processes()
        
        # Start network monitoring
        self.network_monitor.start_monitoring(callback=self._on_network_activity)
        
        # Start resource monitoring
        self.resource_monitor.start_monitoring(callback=self._on_resource_update)
        
        # Setup update timer
        self.update_timer = QTimer()
        self.update_timer.timeout.connect(self._update_ui)
        self.update_timer.start(1000)  # Update every second
        
    def _update_ui(self):
        """Update UI components."""
        # Update process table
        self.process_table.update_table()
        
        # Update network view
        self.network_view.update_view()
        
        # Update resource view
        self.resource_view.update_view()
        
        # Update breach counter and shield status
        self._update_status()
        
    def _update_status(self):
        """Update the breach counter and shield status."""
        external_connections = len(self.network_monitor.get_external_connections())
        self.breach_counter.setText(f"External Connections: {external_connections}")
        
        # Update shield status based on number of external connections
        if external_connections == 0:
            self.shield_status.setText("🟢")
        elif external_connections < 5:
            self.shield_status.setText("🟠")
        else:
            self.shield_status.setText("🔴")
            
    def _on_network_activity(self, connection_info):
        """Callback for network activity."""
        self.network_view.add_connection(connection_info)
        self._update_status()
        
    def _on_resource_update(self, stats):
        """Callback for resource updates."""
        self.resource_view.update_stats(stats)
        
    def closeEvent(self, event):
        """Handle application closure."""
        self.network_monitor.stop_monitoring()
        self.resource_monitor.stop_monitoring()
        self.update_timer.stop()
        super().closeEvent(event)
