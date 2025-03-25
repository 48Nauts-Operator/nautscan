import { createTheme } from '@mui/material/styles';

// Cyberpunk theme colors
const neonBlue = '#00f3ff';
const neonPink = '#ff00ff';
const darkBlue = '#001e3c';
const darkBackground = '#0a0a0a';
const darkerBackground = '#050505';

// Grid pattern
const gridPattern = `
  linear-gradient(to right, ${neonBlue}10 1px, transparent 1px),
  linear-gradient(to bottom, ${neonBlue}10 1px, transparent 1px)
`;

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: neonBlue,
      light: '#4cffff',
      dark: '#00c0cc',
      contrastText: '#000000',
    },
    secondary: {
      main: neonPink,
      light: '#ff4dff',
      dark: '#cc00cc',
      contrastText: '#ffffff',
    },
    background: {
      default: darkBackground,
      paper: darkerBackground,
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: gridPattern,
          backgroundSize: '50px 50px',
          '&:before': {
            content: '""',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            background: `radial-gradient(circle at 50% 50%, ${neonBlue}20 0%, transparent 50%)`,
            zIndex: 1,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: 'none',
          '&.MuiButton-contained': {
            background: `linear-gradient(45deg, ${neonBlue} 30%, #00c0ff 90%)`,
            boxShadow: `0 0 20px ${neonBlue}80`,
            border: `1px solid ${neonBlue}40`,
            color: '#000000',
            '&:hover': {
              background: `linear-gradient(45deg, #00c0ff 30%, ${neonBlue} 90%)`,
              boxShadow: `0 0 30px ${neonBlue}`,
              border: `1px solid ${neonBlue}80`,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: `${darkerBackground}dd`,
          backdropFilter: 'blur(10px)',
          borderRadius: 8,
          border: `1px solid ${neonBlue}30`,
          boxShadow: `0 0 20px ${neonBlue}20`,
          '&:hover': {
            boxShadow: `0 0 30px ${neonBlue}30`,
            border: `1px solid ${neonBlue}40`,
          },
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 8,
            padding: '1px',
            background: `linear-gradient(45deg, ${neonBlue}30, transparent)`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: `${darkerBackground}dd`,
          backdropFilter: 'blur(10px)',
          borderRadius: 8,
          border: `1px solid ${neonBlue}30`,
          boxShadow: `0 0 20px ${neonBlue}20`,
          position: 'relative',
          '&:hover': {
            boxShadow: `0 0 30px ${neonBlue}30`,
            border: `1px solid ${neonBlue}40`,
          },
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 8,
            padding: '1px',
            background: `linear-gradient(45deg, ${neonBlue}30, transparent)`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: `${darkBlue}80`,
          '&:before': {
            content: '""',
            position: 'absolute',
            top: -1,
            left: -1,
            right: -1,
            bottom: -1,
            borderRadius: 5,
            padding: '1px',
            background: `linear-gradient(45deg, ${neonBlue}50, transparent)`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
          },
        },
        bar: {
          borderRadius: 4,
          backgroundImage: `linear-gradient(90deg, ${neonBlue} 0%, #00c0ff 100%)`,
          boxShadow: `0 0 10px ${neonBlue}`,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            color: neonBlue,
            fontWeight: 600,
            borderBottom: `2px solid ${neonBlue}40`,
            textShadow: `0 0 10px ${neonBlue}80`,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: `${neonBlue}20`,
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          filter: `drop-shadow(0 0 10px ${neonBlue})`,
        },
      },
    },
  },
  typography: {
    h4: {
      color: neonBlue,
      textShadow: `0 0 20px ${neonBlue}80`,
      letterSpacing: '0.1em',
      fontWeight: 600,
    },
    h6: {
      color: neonBlue,
      textShadow: `0 0 10px ${neonBlue}60`,
      letterSpacing: '0.05em',
      fontWeight: 500,
    },
  },
}); 