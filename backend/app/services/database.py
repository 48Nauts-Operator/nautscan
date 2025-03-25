from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import select, and_, desc, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from ..models.database import LocationRecord, ConnectionRecord, TrafficStatsRecord, Alert, PacketRecord
from ..models.network import Connection, Location, TrafficStats

class DatabaseService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_or_create_location(self, location: Location) -> LocationRecord:
        """Get existing location record or create new one"""
        stmt = select(LocationRecord).where(
            and_(
                LocationRecord.latitude == location.lat,
                LocationRecord.longitude == location.lng
            )
        )
        result = await self.session.execute(stmt)
        location_record = result.scalar_one_or_none()

        if not location_record:
            location_record = LocationRecord(
                latitude=location.lat,
                longitude=location.lng,
                city=location.city,
                country=location.country
            )
            self.session.add(location_record)
            await self.session.flush()

        return location_record

    async def save_connection(self, connection: Connection):
        """Save connection to database"""
        # Get or create location records
        source_location = await self.get_or_create_location(connection.source)
        dest_location = await self.get_or_create_location(connection.destination)

        # Create connection record
        connection_record = ConnectionRecord(
            connection_id=connection.id,
            source_id=source_location.id,
            destination_id=dest_location.id,
            protocol=connection.protocol,
            source_port=connection.source_port,
            destination_port=connection.destination_port,
            bytes_sent=connection.bytes_sent,
            bytes_received=connection.bytes_received,
            timestamp=connection.timestamp,
            duration=connection.duration,
            application=connection.application,
            status=connection.status
        )
        self.session.add(connection_record)
        await self.session.commit()

    async def save_traffic_stats(self, stats: TrafficStats):
        """Save traffic statistics to database"""
        stats_record = TrafficStatsRecord(
            timestamp=stats.timestamp,
            total_connections=stats.total_connections,
            active_connections=stats.active_connections,
            bytes_per_second=stats.bytes_per_second,
            total_bytes=stats.total_bytes,
            connections_per_second=stats.connections_per_second,
            top_protocols=stats.top_protocols,
            top_applications=stats.top_applications
        )
        self.session.add(stats_record)
        await self.session.commit()

    async def get_connection_history(
        self,
        start_time: datetime,
        end_time: datetime,
        limit: int = 100,
        protocol: Optional[str] = None,
        application: Optional[str] = None
    ) -> List[Connection]:
        """Get historical connection data"""
        query = select(ConnectionRecord).where(
            and_(
                ConnectionRecord.timestamp >= start_time,
                ConnectionRecord.timestamp <= end_time
            )
        )

        if protocol:
            query = query.where(ConnectionRecord.protocol == protocol)
        if application:
            query = query.where(ConnectionRecord.application == application)

        query = query.order_by(desc(ConnectionRecord.timestamp)).limit(limit)
        result = await self.session.execute(query)
        records = result.scalars().all()

        return [
            Connection(
                id=record.connection_id,
                source=Location(
                    lat=record.source.latitude,
                    lng=record.source.longitude,
                    city=record.source.city,
                    country=record.source.country
                ),
                destination=Location(
                    lat=record.destination.latitude,
                    lng=record.destination.longitude,
                    city=record.destination.city,
                    country=record.destination.country
                ),
                protocol=record.protocol,
                source_port=record.source_port,
                destination_port=record.destination_port,
                bytes_sent=record.bytes_sent,
                bytes_received=record.bytes_received,
                timestamp=record.timestamp,
                duration=record.duration,
                application=record.application,
                status=record.status
            )
            for record in records
        ]

    async def get_stats_history(
        self,
        start_time: datetime,
        end_time: datetime,
        interval: str = "1m"
    ) -> List[TrafficStats]:
        """Get historical traffic statistics"""
        query = select(TrafficStatsRecord).where(
            and_(
                TrafficStatsRecord.timestamp >= start_time,
                TrafficStatsRecord.timestamp <= end_time
            )
        ).order_by(TrafficStatsRecord.timestamp)

        result = await self.session.execute(query)
        records = result.scalars().all()

        return [
            TrafficStats(
                total_connections=record.total_connections,
                active_connections=record.active_connections,
                bytes_per_second=record.bytes_per_second,
                total_bytes=record.total_bytes,
                connections_per_second=record.connections_per_second,
                top_protocols=record.top_protocols,
                top_applications=record.top_applications,
                timestamp=record.timestamp
            )
            for record in records
        ]

    async def save_alert(
        self,
        level: str,
        category: str,
        message: str,
        details: Optional[Dict] = None,
        connection_id: Optional[str] = None
    ):
        """Save an alert to the database"""
        alert = Alert(
            level=level,
            category=category,
            message=message,
            details=details,
            connection_id=connection_id
        )
        self.session.add(alert)
        await self.session.commit()

    async def get_alerts(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        level: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 100
    ) -> List[Alert]:
        """Get alerts with optional filtering"""
        query = select(Alert)

        if start_time and end_time:
            query = query.where(
                and_(
                    Alert.timestamp >= start_time,
                    Alert.timestamp <= end_time
                )
            )
        if level:
            query = query.where(Alert.level == level)
        if category:
            query = query.where(Alert.category == category)

        query = query.order_by(desc(Alert.timestamp)).limit(limit)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def save_packet(self, packet_data: Dict[str, Any], is_malicious: bool = False, 
                          threat_category: Optional[str] = None, connection_id: Optional[str] = None) -> PacketRecord:
        """Save a packet to the database"""
        # Calculate expiration date - 7 days for normal packets, None (never expire) for malicious
        expire_at = None if is_malicious else datetime.utcnow() + timedelta(days=7)
        
        # Create the packet record
        packet_record = PacketRecord(
            timestamp=packet_data.get('timestamp', datetime.utcnow()),
            source_ip=packet_data.get('source_ip'),
            source_port=packet_data.get('source_port'),
            source_device_name=packet_data.get('source_device_name'),
            destination_ip=packet_data.get('destination_ip'),
            destination_port=packet_data.get('destination_port'),
            destination_device_name=packet_data.get('destination_device_name'),
            protocol=packet_data.get('protocol'),
            protocol_version=packet_data.get('protocol_version'),
            length=packet_data.get('length', 0),
            ttl=packet_data.get('ttl'),
            flags=packet_data.get('flags'),
            application_protocol=packet_data.get('application_protocol'),
            payload_excerpt=packet_data.get('payload_excerpt'),
            raw_packet=packet_data.get('raw_packet'),
            packet_summary=packet_data.get('packet_summary'),
            is_malicious=is_malicious,
            threat_category=threat_category,
            connection_id=connection_id,
            expire_at=expire_at
        )
        
        self.session.add(packet_record)
        await self.session.commit()
        return packet_record

    async def get_packets(self, 
                          limit: int = 100, 
                          offset: int = 0,
                          protocol: Optional[str] = None,
                          source_ip: Optional[str] = None,
                          destination_ip: Optional[str] = None,
                          is_malicious: Optional[bool] = None,
                          start_time: Optional[datetime] = None,
                          end_time: Optional[datetime] = None,
                          connection_id: Optional[str] = None) -> List[PacketRecord]:
        """Get packets with filtering options"""
        query = select(PacketRecord)
        
        # Apply filters
        if protocol:
            query = query.where(PacketRecord.protocol == protocol)
        if source_ip:
            query = query.where(PacketRecord.source_ip == source_ip)
        if destination_ip:
            query = query.where(PacketRecord.destination_ip == destination_ip)
        if is_malicious is not None:
            query = query.where(PacketRecord.is_malicious == is_malicious)
        if start_time and end_time:
            query = query.where(
                and_(
                    PacketRecord.timestamp >= start_time,
                    PacketRecord.timestamp <= end_time
                )
            )
        if connection_id:
            query = query.where(PacketRecord.connection_id == connection_id)
            
        # Apply pagination
        query = query.order_by(desc(PacketRecord.timestamp)).offset(offset).limit(limit)
        
        # Execute query
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def count_packets(self,
                           protocol: Optional[str] = None,
                           source_ip: Optional[str] = None,
                           destination_ip: Optional[str] = None,
                           is_malicious: Optional[bool] = None,
                           start_time: Optional[datetime] = None,
                           end_time: Optional[datetime] = None,
                           connection_id: Optional[str] = None) -> int:
        """Count packets with filtering options"""
        query = select(func.count(PacketRecord.id))
        
        # Apply filters
        if protocol:
            query = query.where(PacketRecord.protocol == protocol)
        if source_ip:
            query = query.where(PacketRecord.source_ip == source_ip)
        if destination_ip:
            query = query.where(PacketRecord.destination_ip == destination_ip)
        if is_malicious is not None:
            query = query.where(PacketRecord.is_malicious == is_malicious)
        if start_time and end_time:
            query = query.where(
                and_(
                    PacketRecord.timestamp >= start_time,
                    PacketRecord.timestamp <= end_time
                )
            )
        if connection_id:
            query = query.where(PacketRecord.connection_id == connection_id)
            
        # Execute query
        result = await self.session.execute(query)
        return result.scalar_one()
    
    async def mark_packet_as_malicious(self, packet_id: int, 
                                       threat_category: Optional[str] = None,
                                       confidence_score: Optional[float] = None,
                                       notes: Optional[str] = None) -> PacketRecord:
        """Mark a packet as malicious and update its expiration date"""
        # Get the packet
        packet = await self.session.get(PacketRecord, packet_id)
        if not packet:
            raise ValueError(f"Packet with ID {packet_id} not found")
            
        # Update the packet
        packet.is_malicious = True
        packet.threat_category = threat_category
        packet.confidence_score = confidence_score
        packet.notes = notes
        packet.expire_at = None  # Never expire malicious packets
        
        await self.session.commit()
        return packet
    
    async def run_housekeeping(self) -> int:
        """Delete expired packets"""
        now = datetime.utcnow()
        query = delete(PacketRecord).where(
            and_(
                PacketRecord.expire_at.isnot(None),
                PacketRecord.expire_at <= now
            )
        )
        result = await self.session.execute(query)
        await self.session.commit()
        return result.rowcount  # Return number of deleted rows
        
    async def get_malicious_ip_list(self) -> List[Dict[str, Any]]:
        """Get a list of malicious IPs for blocklist generation"""
        # First get source IPs
        source_query = select(
            PacketRecord.source_ip.label('ip'),
            func.count(PacketRecord.id).label('occurrence_count')
        ).where(
            PacketRecord.is_malicious == True
        ).group_by(
            PacketRecord.source_ip
        )
        
        # Then get destination IPs
        dest_query = select(
            PacketRecord.destination_ip.label('ip'),
            func.count(PacketRecord.id).label('occurrence_count')
        ).where(
            PacketRecord.is_malicious == True
        ).group_by(
            PacketRecord.destination_ip
        )
        
        source_result = await self.session.execute(source_query)
        dest_result = await self.session.execute(dest_query)
        
        # Combine and deduplicate results
        ip_counts = {}
        for row in source_result:
            ip_counts[row.ip] = row.occurrence_count
            
        for row in dest_result:
            if row.ip in ip_counts:
                ip_counts[row.ip] += row.occurrence_count
            else:
                ip_counts[row.ip] = row.occurrence_count
                
        return [{'ip': ip, 'occurrence_count': count} for ip, count in ip_counts.items()] 