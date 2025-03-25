import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SafeIcon,
} from '@mui/icons-material';

interface Connection {
  id: string;
  timestamp: string;
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  port: number;
  location: string;
  threatLevel: 'safe' | 'warning' | 'danger';
  details: string;
}

const threatLevelConfig = {
  safe: {
    icon: SafeIcon,
    color: '#00ff00',
    label: 'Safe',
  },
  warning: {
    icon: WarningIcon,
    color: '#ffaa00',
    label: 'Warning',
  },
  danger: {
    icon: ErrorIcon,
    color: '#ff0000',
    label: 'Danger',
  },
};

export default function ConnectionsTable() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const theme = useTheme();

  // Mock data - replace with real data
  const connections: Connection[] = Array.from({ length: 100 }, (_, index) => ({
    id: `conn-${index}`,
    timestamp: new Date(Date.now() - index * 60000).toISOString(),
    sourceIp: '192.168.1.1',
    destinationIp: '8.8.8.8',
    protocol: 'TCP',
    port: 443,
    location: 'Mountain View, US',
    threatLevel: ['safe', 'warning', 'danger'][Math.floor(Math.random() * 3)] as Connection['threatLevel'],
    details: 'HTTPS Traffic',
  }));

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        width: '100%',
        overflow: 'hidden',
        backgroundColor: 'background.paper',
      }}
    >
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          Recent Connections
        </Typography>
      </Box>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Source IP</TableCell>
              <TableCell>Destination IP</TableCell>
              <TableCell>Protocol</TableCell>
              <TableCell>Port</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Threat Level</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {connections
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((connection) => {
                const ThreatIcon = threatLevelConfig[connection.threatLevel].icon;
                return (
                  <TableRow hover key={connection.id}>
                    <TableCell>
                      {new Date(connection.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>{connection.sourceIp}</TableCell>
                    <TableCell>{connection.destinationIp}</TableCell>
                    <TableCell>{connection.protocol}</TableCell>
                    <TableCell>{connection.port}</TableCell>
                    <TableCell>{connection.location}</TableCell>
                    <TableCell>
                      <Chip
                        icon={<ThreatIcon />}
                        label={threatLevelConfig[connection.threatLevel].label}
                        sx={{
                          backgroundColor: `${threatLevelConfig[connection.threatLevel].color}20`,
                          color: threatLevelConfig[connection.threatLevel].color,
                          border: `1px solid ${threatLevelConfig[connection.threatLevel].color}40`,
                          '& .MuiChip-icon': {
                            color: threatLevelConfig[connection.threatLevel].color,
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell>{connection.details}</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[25, 50, 100]}
        component="div"
        count={connections.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
} 