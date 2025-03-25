import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import { useWebSocket } from '../hooks/useWebSocket';
import { fetchWithAuth } from '../utils/api';

interface SystemStats {
  cpu_percent: number;
  memory_percent: number;
  disk_usage: number;
  num_processes: number;
}

export default function SystemResources() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const { messages } = useWebSocket('system');

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetchWithAuth('/processes/system/resources');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  if (!stats) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        System Resources
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                CPU Usage
              </Typography>
              <Box display="flex" alignItems="center">
                <Box width="100%" mr={1}>
                  <LinearProgress
                    variant="determinate"
                    value={stats.cpu_percent}
                    color={stats.cpu_percent > 80 ? 'error' : 'primary'}
                  />
                </Box>
                <Box minWidth={35}>
                  <Typography variant="body2" color="textSecondary">
                    {`${Math.round(stats.cpu_percent)}%`}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Memory Usage
              </Typography>
              <Box display="flex" alignItems="center">
                <Box width="100%" mr={1}>
                  <LinearProgress
                    variant="determinate"
                    value={stats.memory_percent}
                    color={stats.memory_percent > 80 ? 'error' : 'primary'}
                  />
                </Box>
                <Box minWidth={35}>
                  <Typography variant="body2" color="textSecondary">
                    {`${Math.round(stats.memory_percent)}%`}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Disk Usage
              </Typography>
              <Box display="flex" alignItems="center">
                <Box width="100%" mr={1}>
                  <LinearProgress
                    variant="determinate"
                    value={stats.disk_usage}
                    color={stats.disk_usage > 80 ? 'error' : 'primary'}
                  />
                </Box>
                <Box minWidth={35}>
                  <Typography variant="body2" color="textSecondary">
                    {`${Math.round(stats.disk_usage)}%`}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Running Processes
              </Typography>
              <Typography variant="h5">{stats.num_processes}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 