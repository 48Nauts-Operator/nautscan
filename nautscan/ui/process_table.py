from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QTableWidget, QTableWidgetItem,
                             QHeaderView, QLabel, QLineEdit)
from PyQt6.QtCore import Qt
import psutil

class ProcessTable(QWidget):
    def __init__(self, process_monitor):
        super().__init__()
        self.process_monitor = process_monitor
        self._setup_ui()
        
    def _setup_ui(self):
        """Setup the process table UI."""
        layout = QVBoxLayout(self)
        
        # Add search box
        self.search_box = QLineEdit()
        self.search_box.setPlaceholderText("Search processes...")
        self.search_box.textChanged.connect(self.filter_processes)
        layout.addWidget(self.search_box)
        
        # Create table
        self.table = QTableWidget()
        self.table.setColumnCount(7)
        self.table.setHorizontalHeaderLabels([
            "PID", "Name", "Status", "CPU %", "Memory (MB)",
            "Network Connections", "AI Related"
        ])
        
        # Set table properties
        header = self.table.horizontalHeader()
        for i in range(7):
            header.setSectionResizeMode(i, QHeaderView.ResizeMode.ResizeToContents)
        
        self.table.setShowGrid(True)
        self.table.setAlternatingRowColors(True)
        self.table.setSortingEnabled(True)
        
        layout.addWidget(self.table)
        
        # Add status label
        self.status_label = QLabel()
        layout.addWidget(self.status_label)
        
    def update_table(self):
        """Update the process table with current process information."""
        processes = self.process_monitor.update_processes()
        self._populate_table(processes)
        
    def _populate_table(self, processes):
        """Populate the table with process information."""
        # Store current sorting
        current_sort_column = self.table.horizontalHeader().sortIndicatorSection()
        current_sort_order = self.table.horizontalHeader().sortIndicatorOrder()
        
        # Disable sorting temporarily for better performance
        self.table.setSortingEnabled(False)
        
        # Clear table
        self.table.setRowCount(0)
        
        # Filter text
        filter_text = self.search_box.text().lower()
        
        row = 0
        for pid, info in processes.items():
            # Apply filter if any
            if filter_text and filter_text not in info['name'].lower():
                continue
                
            self.table.insertRow(row)
            
            # PID
            self.table.setItem(row, 0, QTableWidgetItem(str(pid)))
            
            # Name
            self.table.setItem(row, 1, QTableWidgetItem(info['name']))
            
            # Status
            self.table.setItem(row, 2, QTableWidgetItem(info['status']))
            
            # CPU %
            cpu_item = QTableWidgetItem()
            cpu_item.setData(Qt.ItemDataRole.DisplayRole, info['cpu_percent'])
            self.table.setItem(row, 3, cpu_item)
            
            # Memory (MB)
            memory_mb = info['memory_rss'] / (1024 * 1024)  # Convert to MB
            memory_item = QTableWidgetItem()
            memory_item.setData(Qt.ItemDataRole.DisplayRole, memory_mb)
            self.table.setItem(row, 4, memory_item)
            
            # Network Connections
            num_connections = len(info.get('connections', []))
            conn_item = QTableWidgetItem()
            conn_item.setData(Qt.ItemDataRole.DisplayRole, num_connections)
            self.table.setItem(row, 5, conn_item)
            
            # AI Related
            ai_related = "Yes" if info.get('is_ai_related', False) else "No"
            self.table.setItem(row, 6, QTableWidgetItem(ai_related))
            
            row += 1
            
        # Re-enable sorting
        self.table.setSortingEnabled(True)
        
        # Restore sorting
        self.table.sortItems(current_sort_column, current_sort_order)
        
        # Update status
        total_processes = self.table.rowCount()
        ai_processes = sum(1 for i in range(total_processes)
                         if self.table.item(i, 6).text() == "Yes")
        self.status_label.setText(
            f"Total Processes: {total_processes} | AI-Related: {ai_processes}"
        )
        
    def filter_processes(self):
        """Filter processes based on search text."""
        self.update_table()
