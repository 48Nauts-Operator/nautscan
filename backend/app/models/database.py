from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean, Text, LargeBinary
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class LocationRecord(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    city = Column(String, nullable=True)
    country = Column(String, nullable=True)

    # Relationships
    source_connections = relationship("ConnectionRecord", back_populates="source", foreign_keys="ConnectionRecord.source_id")
    destination_connections = relationship("ConnectionRecord", back_populates="destination", foreign_keys="ConnectionRecord.destination_id")

class ConnectionRecord(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(String, index=True)  # Composite identifier for the connection
    source_id = Column(Integer, ForeignKey("locations.id"))
    destination_id = Column(Integer, ForeignKey("locations.id"))
    protocol = Column(String)
    source_port = Column(Integer)
    destination_port = Column(Integer)
    bytes_sent = Column(Integer, default=0)
    bytes_received = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)
    duration = Column(Float, nullable=True)
    application = Column(String, nullable=True)
    status = Column(String, default="active")

    # Relationships
    source = relationship("LocationRecord", back_populates="source_connections", foreign_keys=[source_id])
    destination = relationship("LocationRecord", back_populates="destination_connections", foreign_keys=[destination_id])

class TrafficStatsRecord(Base):
    __tablename__ = "traffic_stats"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    total_connections = Column(Integer, default=0)
    active_connections = Column(Integer, default=0)
    bytes_per_second = Column(Float, default=0.0)
    total_bytes = Column(Integer, default=0)
    connections_per_second = Column(Float, default=0.0)
    top_protocols = Column(JSON)  # Store as JSON for flexibility
    top_applications = Column(JSON)  # Store as JSON for flexibility

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    level = Column(String)  # info, warning, error
    category = Column(String)  # security, performance, system
    message = Column(String)
    details = Column(JSON, nullable=True)
    connection_id = Column(String, nullable=True)  # Reference to related connection if any

class PacketRecord(Base):
    __tablename__ = "packets"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Source and destination information
    source_ip = Column(String, index=True)
    source_port = Column(Integer, nullable=True) 
    source_device_name = Column(String, nullable=True)  # Local device name from nmap or hostname
    destination_ip = Column(String, index=True)
    destination_port = Column(Integer, nullable=True)
    destination_device_name = Column(String, nullable=True)  # Remote device name or provider
    
    # Protocol information
    protocol = Column(String, index=True)  # TCP, UDP, ICMP, etc.
    protocol_version = Column(String, nullable=True)  # IPv4, IPv6
    
    # Packet details
    length = Column(Integer)  # Packet size in bytes
    ttl = Column(Integer, nullable=True)  # Time to live
    flags = Column(String, nullable=True)  # TCP flags (SYN, ACK, etc.)
    
    # Application layer data
    application_protocol = Column(String, nullable=True)  # HTTP, DNS, etc.
    payload_excerpt = Column(Text, nullable=True)  # First N bytes of payload as hex
    
    # Optional raw packet data (can be large)
    raw_packet = Column(LargeBinary, nullable=True)  # Full raw packet data
    packet_summary = Column(Text, nullable=True)  # Scapy summary of packet
    
    # Classification fields
    is_malicious = Column(Boolean, default=False, index=True)
    threat_category = Column(String, nullable=True)  # Type of threat if malicious
    confidence_score = Column(Float, nullable=True)  # Confidence of malicious classification (0-1)
    notes = Column(Text, nullable=True)  # Analyst notes
    
    # Relationship fields
    connection_id = Column(String, nullable=True, index=True)  # Related connection ID
    
    # Timestamps for housekeeping
    created_at = Column(DateTime, default=datetime.utcnow)
    expire_at = Column(DateTime, nullable=True, index=True)  # When to delete this record 