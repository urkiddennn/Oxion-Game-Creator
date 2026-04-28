export const theme = {
  colors: {
    background: '#0F1115', // Deep matte black/grey
    surface: '#1A1D23',    // Lighter surface
    surfaceElevated: '#252932',
    primary: '#00D1FF',    // Electric Cyan
    secondary: '#FF00D1',  // Magenta Neon
    accent: '#7000FF',     // Purple
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#2E333D',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 20,
    full: 9999,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    h3: {
      fontSize: 18,
      fontWeight: '600',
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      color: '#94A3B8',
    },
  },
} as const;

export type Theme = typeof theme;
