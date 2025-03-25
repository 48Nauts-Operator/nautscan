import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Stack,
  SelectChangeEvent,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface SettingsProps {
  onSave?: (settings: Settings) => void;
}

interface Settings {
  interface: string;
  captureFilter: string;
  maxPackets: number;
  autoRefresh: boolean;
  refreshInterval: number;
  promiscuousMode: boolean;
  monitorMode: boolean;
  enableIpv6: boolean;
  captureLimit: {
    enabled: boolean;
    packets: number;
    duration: number; // seconds
  };
  darkMode: boolean;
}

interface NetworkInterface {
  name: string;
  description: string;
  ip: string;
  mac: string;
  is_up: boolean;
}

export default function Settings({ onSave }: SettingsProps) {
  const [settings, setSettings] = useState<Settings>({
    interface: 'any',
    captureFilter: 'tcp or udp',
    maxPackets: 1000,
    autoRefresh: true,
    refreshInterval: 5,
    promiscuousMode: true,
    monitorMode: false,
    enableIpv6: true,
    captureLimit: {
      enabled: false,
      packets: 10000,
      duration: 300,
    },
    darkMode: true,
  });

  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch network interfaces from the backend
  const fetchInterfaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/packets/interfaces');
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setInterfaces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network interfaces');
      console.error('Failed to fetch interfaces:', err);
      // Set mock interfaces as fallback
      setInterfaces([
        { name: 'any', description: 'Any Interface', ip: '', mac: '', is_up: true },
        { name: 'eth0', description: 'Ethernet (eth0)', ip: '192.168.1.100', mac: '00:11:22:33:44:55', is_up: true },
        { name: 'wlan0', description: 'Wireless (wlan0)', ip: '192.168.1.101', mac: 'AA:BB:CC:DD:EE:FF', is_up: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Load interfaces on component mount
  useEffect(() => {
    fetchInterfaces();
  }, []);

  const handleSelectChange = (field: keyof Settings) => (event: SelectChangeEvent) => {
    setSettings((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleTextFieldChange = (field: keyof Settings) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = field === 'maxPackets' || field === 'refreshInterval'
      ? Number(event.target.value)
      : event.target.value;
    
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCaptureLimitChange = (field: 'enabled' | 'packets' | 'duration') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'enabled' 
      ? event.target.checked 
      : Number(event.target.value);
    
    setSettings((prev) => ({
      ...prev,
      captureLimit: {
        ...prev.captureLimit,
        [field]: value,
      },
    }));
  };

  const handleSwitchChange = (field: keyof Settings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSettings((prev) => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleSave = () => {
    onSave?.(settings);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        maxWidth: 800,
        mx: 'auto',
        backgroundColor: 'background.paper',
      }}
    >
      <Typography variant="h6" gutterBottom>
        Settings
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Stack spacing={3}>
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Packet Capture Settings
          </Typography>
          
          <FormControl fullWidth margin="normal">
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <InputLabel id="network-interface-label">Network Interface</InputLabel>
              <Button 
                startIcon={<RefreshIcon />}
                onClick={fetchInterfaces}
                size="small"
                sx={{ ml: 'auto', mb: 1 }}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </Box>
            <Select
              labelId="network-interface-label"
              value={settings.interface}
              label="Network Interface"
              onChange={handleSelectChange('interface')}
            >
              {loading ? (
                <MenuItem value="">
                  <CircularProgress size={20} sx={{ mr: 1 }} /> Loading...
                </MenuItem>
              ) : interfaces.length === 0 ? (
                <MenuItem value="">No interfaces found</MenuItem>
              ) : (
                interfaces.map((iface) => (
                  <MenuItem 
                    key={iface.name} 
                    value={iface.name}
                    disabled={!iface.is_up}
                  >
                    {iface.description || iface.name} {iface.ip ? `(${iface.ip})` : ''}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <TextField
              label="Capture Filter"
              value={settings.captureFilter}
              onChange={handleTextFieldChange('captureFilter')}
              helperText="BPF filter syntax (e.g., 'tcp or udp port 80')"
            />
          </FormControl>

          <FormControl fullWidth margin="normal">
            <TextField
              type="number"
              label="Maximum Packet Buffer Size"
              value={settings.maxPackets}
              onChange={handleTextFieldChange('maxPackets')}
              inputProps={{ min: 100, max: 100000 }}
              helperText="Number of packets to keep in memory"
            />
          </FormControl>
          
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.promiscuousMode}
                  onChange={handleSwitchChange('promiscuousMode')}
                />
              }
              label="Promiscuous Mode"
            />
            <Typography variant="caption" display="block" sx={{ ml: 4, mt: -1 }}>
              Capture all packets on the network, not just those addressed to this interface
            </Typography>
          </Box>
          
          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.monitorMode}
                  onChange={handleSwitchChange('monitorMode')}
                />
              }
              label="Monitor Mode (Wireless)"
            />
            <Typography variant="caption" display="block" sx={{ ml: 4, mt: -1 }}>
              Enable monitor mode for capturing wireless frames (requires compatible hardware)
            </Typography>
          </Box>
          
          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableIpv6}
                  onChange={handleSwitchChange('enableIpv6')}
                />
              }
              label="Enable IPv6 Capture"
            />
          </Box>
        </Box>
        
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Capture Limits
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.captureLimit.enabled}
                onChange={handleCaptureLimitChange('enabled')}
              />
            }
            label="Enable Capture Limits"
          />
          
          {settings.captureLimit.enabled && (
            <>
              <FormControl fullWidth margin="normal">
                <TextField
                  type="number"
                  label="Packet Count Limit"
                  value={settings.captureLimit.packets}
                  onChange={handleCaptureLimitChange('packets')}
                  inputProps={{ min: 100, max: 1000000 }}
                  helperText="Stop capture after this many packets (0 = unlimited)"
                />
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <TextField
                  type="number"
                  label="Duration Limit (seconds)"
                  value={settings.captureLimit.duration}
                  onChange={handleCaptureLimitChange('duration')}
                  inputProps={{ min: 0, max: 86400 }}
                  helperText="Stop capture after this many seconds (0 = unlimited)"
                />
              </FormControl>
            </>
          )}
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Display Settings
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoRefresh}
                onChange={handleSwitchChange('autoRefresh')}
              />
            }
            label="Auto Refresh"
          />

          {settings.autoRefresh && (
            <FormControl fullWidth margin="normal">
              <TextField
                type="number"
                label="Refresh Interval (seconds)"
                value={settings.refreshInterval}
                onChange={handleTextFieldChange('refreshInterval')}
                inputProps={{ min: 1, max: 60 }}
              />
            </FormControl>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={settings.darkMode}
                onChange={handleSwitchChange('darkMode')}
              />
            }
            label="Dark Mode"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
            }}
          >
            Save Settings
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
} 