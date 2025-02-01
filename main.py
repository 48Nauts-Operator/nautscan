import sys
from PyQt6.QtWidgets import QApplication
from nautscan.ui.main_window import MainWindow

def main():
    """Main entry point for the application."""
    # Create application
    app = QApplication(sys.argv)
    
    # Set application style
    app.setStyle('Fusion')
    
    # Create and show main window
    window = MainWindow()
    window.show()
    
    # Start event loop
    sys.exit(app.exec())
    
if __name__ == '__main__':
    main()
