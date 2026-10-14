'use client'

import { createTheme, alpha } from '@mui/material/styles'

// Material-inspired color palette — custom brand identity over stock MD3
const palette = {
  primary: {
    main: '#2D6A4F',       // Deep green — fresh, food-forward
    light: '#52B788',
    dark: '#1B4332',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#F4845F',       // Warm coral — appetite-inducing accent
    light: '#F9A889',
    dark: '#D4603A',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#BA1A1A',
    light: '#FF897D',
    dark: '#93000A',
  },
  warning: {
    main: '#E9821D',
    light: '#FFB775',
    dark: '#C96600',
  },
  success: {
    main: '#386A20',
    light: '#6EC142',
    dark: '#1B5200',
  },
  background: {
    default: '#F8FAF7',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#191C19',
    secondary: '#3F4E3F',
  },
}

export const theme = createTheme({
  palette: {
    ...palette,
    mode: 'light',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
    h2: { fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25 },
    h3: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.005em', lineHeight: 1.3 },
    h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.35 },
    h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.45 },
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.57 },
    button: { fontWeight: 600, letterSpacing: '0.02em', textTransform: 'none' },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    `0 1px 2px ${alpha('#000', 0.05)}`,
    `0 1px 3px ${alpha('#000', 0.07)}, 0 1px 2px ${alpha('#000', 0.05)}`,
    `0 4px 6px ${alpha('#000', 0.07)}, 0 2px 4px ${alpha('#000', 0.05)}`,
    `0 10px 15px ${alpha('#000', 0.07)}, 0 4px 6px ${alpha('#000', 0.05)}`,
    `0 20px 25px ${alpha('#000', 0.07)}, 0 10px 10px ${alpha('#000', 0.04)}`,
    `0 25px 50px ${alpha('#000', 0.12)}`,
    ...Array(18).fill('none'),
  ] as import('@mui/material').Shadows,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        contained: {
          '&:hover': { transform: 'translateY(-1px)', transition: 'transform 0.15s ease' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${alpha('#000', 0.06)}`,
          boxShadow: `0 1px 3px ${alpha('#000', 0.07)}, 0 1px 2px ${alpha('#000', 0.05)}`,
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: `0 1px 3px ${alpha('#000', 0.07)}`,
          borderBottom: `1px solid ${alpha('#000', 0.06)}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
})

export default theme
