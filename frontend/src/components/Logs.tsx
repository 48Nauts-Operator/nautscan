import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  InputAdornment,
  Stack,
  SelectChangeEvent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

interface Log {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info' | 'success';
  source: string;
  message: string;
  details?: string;
}

const logLevelConfig = {
  error: {
    icon: ErrorIcon,
    color: '#ff1744',
    label: 'Error',
  },
  warning: {
    icon: WarningIcon,
    color: '#ffa726',
    label: 'Warning',
  },
  info: {
    icon: InfoIcon,
    color: '#29b6f6',
    label: 'Info',
  },
  success: {
    icon: SuccessIcon,
    color: '#66bb6a',
    label: 'Success',
  },
};

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    // Mock log data - replace with actual API call
    const mockLogs: Log[] = Array.from({ length: 100 }, (_, i) => ({
      id: `log-${i}`,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      level: ['error', 'warning', 'info', 'success'][Math.floor(Math.random() * 4)] as Log['level'],
      source: ['System', 'Network', 'Security', 'Application'][Math.floor(Math.random() * 4)],
      message: `Sample log message ${i + 1}`,
      details: Math.random() > 0.5 ? `Additional details for log ${i + 1}` : undefined,
    }));

    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
  }, []);

  useEffect(() => {
    let result = logs;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) ||
          log.details?.toLowerCase().includes(searchLower) ||
          log.source.toLowerCase().includes(searchLower)
      );
    }

    if (levelFilter !== 'all') {
      result = result.filter((log) => log.level === levelFilter);
    }

    if (sourceFilter !== 'all') {
      result = result.filter((log) => log.source === sourceFilter);
    }

    setFilteredLogs(result);
    setPage(0);
  }, [search, levelFilter, sourceFilter, logs]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const handleLevelFilterChange = (event: SelectChangeEvent) => {
    setLevelFilter(event.target.value);
  };

  const handleSourceFilterChange = (event: SelectChangeEvent) => {
    setSourceFilter(event.target.value);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const clearSearch = () => {
    setSearch('');
  };

  const sources = Array.from(new Set(logs.map((log) => log.source)));

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        System Logs
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          value={search}
          onChange={handleSearchChange}
          placeholder="Search logs..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: search && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={clearSearch}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Level</InputLabel>
          <Select
            value={levelFilter}
            label="Level"
            onChange={handleLevelFilterChange}
          >
            <MenuItem value="all">All Levels</MenuItem>
            {Object.entries(logLevelConfig).map(([level, config]) => (
              <MenuItem key={level} value={level}>
                {config.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Source</InputLabel>
          <Select
            value={sourceFilter}
            label="Source"
            onChange={handleSourceFilterChange}
          >
            <MenuItem value="all">All Sources</MenuItem>
            {sources.map((source) => (
              <MenuItem key={source} value={source}>
                {source}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TableContainer sx={{ flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.8)' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((log) => {
                const LevelIcon = logLevelConfig[log.level].icon;
                return (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<LevelIcon />}
                        label={logLevelConfig[log.level].label}
                        size="small"
                        sx={{
                          backgroundColor: `${logLevelConfig[log.level].color}20`,
                          color: logLevelConfig[log.level].color,
                          border: `1px solid ${logLevelConfig[log.level].color}40`,
                          '& .MuiChip-icon': {
                            color: logLevelConfig[log.level].color,
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell>{log.source}</TableCell>
                    <TableCell>{log.message}</TableCell>
                    <TableCell>{log.details || '-'}</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredLogs.length}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[25, 50, 100]}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
} 