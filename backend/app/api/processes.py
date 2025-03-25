from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status, WebSocket
from sqlalchemy.orm import Session
import psutil

from app.services.process_monitor import ProcessMonitor
from app.core.security import get_current_user
from app.db.session import get_db

router = APIRouter()
process_monitor = ProcessMonitor()

@router.get("/")
async def get_processes(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """Get all running processes."""
    try:
        processes = process_monitor.get_all_processes()
        return processes
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching processes: {str(e)}"
        )

@router.get("/{pid}")
async def get_process_details(
    pid: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Get detailed information about a specific process."""
    process = process_monitor.get_process_by_pid(pid)
    if not process:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Process with PID {pid} not found"
        )
    return process

@router.get("/{pid}/connections")
async def get_process_connections(
    pid: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """Get network connections for a specific process."""
    connections = process_monitor.get_process_network_connections(pid)
    if not connections:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active connections found for PID {pid}"
        )
    return connections

@router.get("/list")
async def list_processes(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[dict]:
    """Get list of running processes."""
    try:
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
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/system/resources")
async def get_system_resources(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Get system resource usage."""
    try:
        return {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory': dict(psutil.virtual_memory()._asdict()),
            'disk': dict(psutil.disk_usage('/')._asdict()),
            'network': dict(psutil.net_io_counters()._asdict()),
            'process_count': len(list(psutil.process_iter()))
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time process monitoring."""
    await websocket.accept()
    try:
        while True:
            # Send system resources every second
            resources = {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory': dict(psutil.virtual_memory()._asdict()),
                'disk': dict(psutil.disk_usage('/')._asdict()),
                'network': dict(psutil.net_io_counters()._asdict()),
                'process_count': len(list(psutil.process_iter()))
            }
            await websocket.send_json(resources)
    except Exception:
        await websocket.close() 