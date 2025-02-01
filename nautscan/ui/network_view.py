from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QTableWidget, QTableWidgetItem,
                             QHeaderView, QTextEdit, QSplitter, QLabel)
from PyQt6.QtCore import Qt
from datetime import datetime

class NetworkView(QWidget):
    def __init__(self, network_monitor):
        super().__init__()
        self.network_monitor = network_monitor
        self._setup_ui()
        self._connection_log = []
        
    def _setup_ui(self):
        """Setup the network view UI."""
        layout = QVBoxLayout(self)
        
        # Create splitter for table and log
        splitter = QSplitter(Qt.Orientation.Vertical)
        layout.addWidget(splitter)
        
        # Create connection table
        self.table = QTableWidget()
        self.table.setColumnCount(7)
        self.table.setHorizontalHeaderLabels([
            "Timestamp", "Source IP", "Destination IP", "Protocol",
            "Port", "External", "Hostname"
        ])
        
        # Set table properties
        header = self.table.horizontalHeader()
        for i in range(7):
            header.setSectionResizeMode(i, QHeaderView.ResizeMode.ResizeToContents)
        
        self.table.setShowGrid(True)
        self.table.setAlternatingRowColors(True)
        self.table.setSortingEnabled(True)
        
        splitter.addWidget(self.table)
        
        # Create log view
        self.log_view = QTextEdit()
        self.log_view.setReadOnly(True)
        self.log_view.setLineWrapMode(QTextEdit.LineWrapMode.NoWrap)
        self.log_view.setStyleSheet("""
            QTextEdit {
                font-family: monospace;
                background-color: #1e1e1e;
                color: #ffffff;
            }
        """)
        splitter.addWidget(self.log_view)
        
        # Add status label
        self.status_label = QLabel()
        layout.addWidget(self.status_label)
        
        # Set initial splitter sizes
        splitter.setSizes([300, 200])
        
    def update_view(self):
        """Update the network view with current connections."""
        connections = self.network_monitor.get_active_connections()
        self._populate_table(connections)
        self._update_status(connections)
        
    def add_connection(self, connection_info):
        """Add a new connection to the view."""
        self._connection_log.append(connection_info)
        self._add_to_log(connection_info)
        self.update_view()
        
    def _populate_table(self, connections):
        """Populate the table with connection information."""
        # Store current sorting
        current_sort_column = self.table.horizontalHeader().sortIndicatorSection()
        current_sort_order = self.table.horizontalHeader().sortIndicatorOrder()
        
        # Disable sorting temporarily for better performance
        self.table.setSortingEnabled(False)
        
        # Clear table
        self.table.setRowCount(0)
        
        for row, conn in enumerate(connections):
            self.table.insertRow(row)
            
            # Timestamp
            self.table.setItem(row, 0, QTableWidgetItem(conn['timestamp']))
            
            # Source IP
            self.table.setItem(row, 1, QTableWidgetItem(conn['src_ip']))
            
            # Destination IP
            self.table.setItem(row, 2, QTableWidgetItem(conn['dst_ip']))
            
            # Protocol
            self.table.setItem(row, 3, QTableWidgetItem(conn['protocol']))
            
            # Port
            port = str(conn['port']) if conn['port'] else 'N/A'
            self.table.setItem(row, 4, QTableWidgetItem(port))
            
            # External
            is_external = "Yes" if conn['is_external'] else "No"
            self.table.setItem(row, 5, QTableWidgetItem(is_external))
            
            # Hostname
            hostname = conn['hostname'] if conn['hostname'] else 'N/A'
            self.table.setItem(row, 6, QTableWidgetItem(hostname))
            
        # Re-enable sorting
        self.table.setSortingEnabled(True)
        
        # Restore sorting
        self.table.sortItems(current_sort_column, current_sort_order)
        
    def _add_to_log(self, connection_info):
        """Add a connection to the log view."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = (
            f"[{timestamp}] {connection_info['protocol']} "
            f"{connection_info['src_ip']} → {connection_info['dst_ip']}"
        )
        
        if connection_info['is_external']:
            log_entry = f"🔴 {log_entry} (EXTERNAL)"
            log_color = "#ff6b6b"
        else:
            log_entry = f"🟢 {log_entry}"
            log_color = "#69db7c"
            
        self.log_view.append(f'<span style="color: {log_color}">{log_entry}</span>')
        
        # Scroll to bottom
        scrollbar = self.log_view.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())
        
    def _update_status(self, connections):
        """Update the status label with connection statistics."""
        total_connections = len(connections)
        external_connections = sum(1 for conn in connections if conn['is_external'])
        
        self.status_label.setText(
            f"Total Connections: {total_connections} | "
            f"External Connections: {external_connections}"
        )
