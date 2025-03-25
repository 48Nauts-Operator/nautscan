import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useWebSocket } from '../hooks/useWebSocket';
import { fetchWithAuth } from '../utils/api';

interface Packet {
  id: string;
  timestamp: string;
  source_ip: string;
  destination_ip: string;
  protocol: string;
  length: number;
  source_port?: number;
  destination_port?: number;
}

export default function PacketMonitor() {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { messages } = useWebSocket('packets');

  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.type === 'packet') {
        setPackets((prev) => [...(Array.isArray(prev) ? prev : []), latestMessage.data].slice(-100));
      }
    }
  }, [messages]);

  const startCapture = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/packets/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        setIsCapturing(true);
        setPackets([]);
      }
    } catch (error) {
      console.error('Error starting capture:', error);
    }
    setLoading(false);
  };

  const stopCapture = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/packets/stop', {
        method: 'POST',
      });
      if (response.ok) {
        setIsCapturing(false);
      }
    } catch (error) {
      console.error('Error stopping capture:', error);
    }
    setLoading(false);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Packet Monitor</Typography>
        <Button
          variant="contained"
          color={isCapturing ? 'error' : 'primary'}
          onClick={isCapturing ? stopCapture : startCapture}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : isCapturing ? 'Stop Capture' : 'Start Capture'}
        </Button>
      </Box>

      <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
        {Array.isArray(packets) && packets.map((packet) => (
          <ListItem key={packet.id}>
            <ListItemText
              primary={`${packet.source_ip}:${packet.source_port || ''} → ${packet.destination_ip}:${
                packet.destination_port || ''
              }`}
              secondary={`${packet.protocol} | ${packet.length} bytes | ${new Date(
                packet.timestamp
              ).toLocaleTimeString()}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
} 