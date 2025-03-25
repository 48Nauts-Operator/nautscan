import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useWebSocket } from '../hooks/useWebSocket';
import { fetchWithAuth } from '../utils/api';

interface PacketStats {
  total_packets: number;
  tcp_packets: number;
  udp_packets: number;
  icmp_packets: number;
  bytes_received: number;
  packets_per_second: number;
  bytes_per_second: number;
}

export default function NetworkStats() {
  const [stats, setStats] = useState<PacketStats | null>(null);
  const { messages } = useWebSocket('packets');

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetchWithAuth('/packets/statistics');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (!stats) {
    return <CircularProgress />;
  }

  const formatNumber = (value: number | undefined) => {
    return typeof value === 'number' ? value.toFixed(1) : '0.0';
  };

  const formatBytes = (bytes: number | undefined) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Network Statistics
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Packets
              </Typography>
              <Typography variant="h5">{stats.total_packets || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Packets/sec
              </Typography>
              <Typography variant="h5">
                {formatNumber(stats.packets_per_second)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Data
              </Typography>
              <Typography variant="h5">
                {formatBytes(stats.bytes_received)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Data Rate
              </Typography>
              <Typography variant="h5">
                {formatBytes(stats.bytes_per_second)}/s
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                TCP Packets
              </Typography>
              <Typography variant="h5">{stats.tcp_packets || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                UDP Packets
              </Typography>
              <Typography variant="h5">{stats.udp_packets || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                ICMP Packets
              </Typography>
              <Typography variant="h5">{stats.icmp_packets || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 