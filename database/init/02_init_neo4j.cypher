// Create constraints
CREATE CONSTRAINT process_id IF NOT EXISTS FOR (p:Process) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT ip_address IF NOT EXISTS FOR (i:IPAddress) REQUIRE i.address IS UNIQUE;
CREATE CONSTRAINT domain_name IF NOT EXISTS FOR (d:Domain) REQUIRE d.name IS UNIQUE;
CREATE CONSTRAINT alert_id IF NOT EXISTS FOR (a:Alert) REQUIRE a.id IS UNIQUE;

// Create indexes
CREATE INDEX process_name IF NOT EXISTS FOR (p:Process) ON (p.name);
CREATE INDEX ip_country IF NOT EXISTS FOR (i:IPAddress) ON (i.country_code);
CREATE INDEX domain_created IF NOT EXISTS FOR (d:Domain) ON (d.created_at);
CREATE INDEX alert_severity IF NOT EXISTS FOR (a:Alert) ON (a.severity);

// Sample initial data for testing
CREATE (p:Process {
    id: 'test-process-1',
    name: 'example-process',
    pid: 1234,
    created_at: datetime()
});

CREATE (ip:IPAddress {
    address: '192.168.1.1',
    country_code: 'US',
    is_vpn: false,
    is_tor: false,
    created_at: datetime()
});

// Create relationships
MATCH (p:Process), (ip:IPAddress)
WHERE p.id = 'test-process-1' AND ip.address = '192.168.1.1'
CREATE (p)-[:CONNECTS_TO {
    protocol: 'TCP',
    source_port: 12345,
    destination_port: 80,
    bytes_sent: 1000,
    bytes_received: 2000,
    first_seen: datetime(),
    last_seen: datetime()
}]->(ip);

// Create stored procedures
CREATE OR REPLACE FUNCTION forensic.find_connection_patterns(start_time: datetime, end_time: datetime)
RETURNS TABLE (
    source_process string,
    destination_ip string,
    connection_count int,
    total_bytes_sent bigint,
    total_bytes_received bigint
) AS
BEGIN
    RETURN
    SELECT 
        p.name as source_process,
        i.address as destination_ip,
        count(*) as connection_count,
        sum(r.bytes_sent) as total_bytes_sent,
        sum(r.bytes_received) as total_bytes_received
    FROM Process p
    JOIN (p)-[r:CONNECTS_TO]->(i:IPAddress)
    WHERE r.first_seen >= $start_time
    AND r.last_seen <= $end_time
    GROUP BY p.name, i.address
    ORDER BY connection_count DESC;
END; 