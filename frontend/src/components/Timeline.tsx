import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Chip,
  IconButton,
  Stack,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  KeyboardArrowUp as CollapseIcon,
  KeyboardArrowDown as ExpandIcon,
} from '@mui/icons-material';

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'connection' | 'security' | 'system' | 'network';
  severity: 'error' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  details?: {
    source?: string;
    destination?: string;
    protocol?: string;
    port?: number;
    status?: string;
  };
}

const severityConfig = {
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

export default function Timeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockEvents: TimelineEvent[] = Array.from({ length: 10 }, (_, i) => ({
        id: `event-${i}`,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        type: ['connection', 'security', 'system', 'network'][
          Math.floor(Math.random() * 4)
        ] as TimelineEvent['type'],
        severity: ['error', 'warning', 'info', 'success'][
          Math.floor(Math.random() * 4)
        ] as TimelineEvent['severity'],
        title: `Event ${i + 1}`,
        description: `Description for event ${i + 1}`,
        details: {
          source: '192.168.1.1',
          destination: '8.8.8.8',
          protocol: 'TCP',
          port: 443,
          status: 'Completed',
        },
      }));

      setEvents(mockEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleRefresh = () => {
    fetchEvents();
  };

  const handleStep = (step: number) => {
    setActiveStep(activeStep === step ? null : step);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        height: '80vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Event Timeline</Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
          sx={{
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(45deg, #1976D2 30%, #1CA8F3 90%)',
            },
          }}
        >
          Refresh
        </Button>
      </Box>

      <Box sx={{ overflow: 'auto', flex: 1 }}>
        <Stepper
          orientation="vertical"
          nonLinear
          activeStep={-1}
          sx={{
            '.MuiStepConnector-line': {
              borderColor: 'rgba(255, 255, 255, 0.12)',
            },
          }}
        >
          {events.map((event, index) => {
            const SeverityIcon = severityConfig[event.severity].icon;
            const isExpanded = activeStep === index;

            return (
              <Step key={event.id} expanded={isExpanded}>
                <StepLabel
                  onClick={() => handleStep(index)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                  }}
                  StepIconComponent={() => (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: `${severityConfig[event.severity].color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${severityConfig[event.severity].color}40`,
                      }}
                    >
                      <SeverityIcon
                        sx={{ fontSize: 16, color: severityConfig[event.severity].color }}
                      />
                    </Box>
                  )}
                >
                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{ py: 1 }}
                  >
                    <Typography variant="subtitle1">{event.title}</Typography>
                    <Chip
                      label={event.type}
                      size="small"
                      sx={{
                        backgroundColor: theme.palette.primary.dark,
                        color: theme.palette.primary.contrastText,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(event.timestamp).toLocaleString()}
                    </Typography>
                    <IconButton
                      size="small"
                      sx={{ ml: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStep(index);
                      }}
                    >
                      {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                    </IconButton>
                  </Stack>
                </StepLabel>
                <StepContent
                  sx={{
                    borderLeft: `1px solid ${theme.palette.primary.main}40`,
                    ml: 2,
                  }}
                >
                  <Box sx={{ py: 2 }}>
                    <Typography paragraph>{event.description}</Typography>
                    {event.details && (
                      <Box
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 1,
                          p: 2,
                          mt: 2,
                        }}
                      >
                        <Typography variant="subtitle2" gutterBottom>
                          Event Details
                        </Typography>
                        <Stack spacing={1}>
                          {Object.entries(event.details).map(([key, value]) => (
                            <Box
                              key={key}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ textTransform: 'capitalize' }}
                              >
                                {key}:
                              </Typography>
                              <Typography variant="body2">{value}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                </StepContent>
              </Step>
            );
          })}
        </Stepper>
      </Box>
    </Paper>
  );
} 