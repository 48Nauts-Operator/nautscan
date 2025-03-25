from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class Location(BaseModel):
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")
    city: Optional[str] = Field(None, description="City name")
    country: Optional[str] = Field(None, description="Country name")
    
class Connection(BaseModel):
    id: str = Field(..., description="Unique connection identifier")
    source: Location = Field(..., description="Source location")
    destination: Location = Field(..., description="Destination location")
    protocol: str = Field(..., description="Network protocol (TCP, UDP, etc.)")
    source_port: int = Field(..., description="Source port")
    destination_port: int = Field(..., description="Destination port")
    bytes_sent: int = Field(0, description="Bytes sent")
    bytes_received: int = Field(0, description="Bytes received")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Connection timestamp")
    duration: Optional[float] = Field(None, description="Connection duration in seconds")
    application: Optional[str] = Field(None, description="Application protocol (HTTP, DNS, etc.)")
    status: str = Field("active", description="Connection status (active, closed, blocked)")

class TrafficStats(BaseModel):
    total_connections: int = Field(0, description="Total number of connections")
    active_connections: int = Field(0, description="Number of active connections")
    bytes_per_second: float = Field(0.0, description="Current traffic rate in bytes/second")
    total_bytes: int = Field(0, description="Total bytes transferred")
    connections_per_second: float = Field(0.0, description="New connections per second")
    top_protocols: dict[str, int] = Field(default_factory=dict, description="Protocol distribution")
    top_applications: dict[str, int] = Field(default_factory=dict, description="Application distribution")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Stats timestamp") 