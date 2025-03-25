import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useWebSocket } from '../hooks/useWebSocket';
import { fetchWithAuth } from '../utils/api';

interface Process {
  id: string;
  pid: number;
  name: string;
  cpu_usage: number;
  memory_usage: number;
  username: string;
}

export default function ProcessList() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const { messages } = useWebSocket('processes');

  useEffect(() => {
    // Initial fetch
    fetchProcesses();
    // Fetch every 5 seconds
    const interval = setInterval(fetchProcesses, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchProcesses = async () => {
    try {
      const response = await fetchWithAuth('/processes');
      const data = await response.json();
      setProcesses(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching processes:', error);
      setProcesses([]);
      setLoading(false);
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  const formatNumber = (value: number | undefined) => {
    return typeof value === 'number' ? value.toFixed(1) : '0.0';
  };

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Running Processes
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>PID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>CPU %</TableCell>
              <TableCell>Memory %</TableCell>
              <TableCell>User</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(processes) && processes.map((process) => (
              <TableRow key={process.id}>
                <TableCell>{process.pid}</TableCell>
                <TableCell>{process.name}</TableCell>
                <TableCell>{formatNumber(process.cpu_usage)}%</TableCell>
                <TableCell>{formatNumber(process.memory_usage)}%</TableCell>
                <TableCell>{process.username}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
} 