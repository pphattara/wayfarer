// lib/theme.ts — Aurora UI design system constants

export const theme = {
  colors: {
    primary: '#0EA5E9',       // sky blue
    secondary: '#38BDF8',     // light sky
    accent: '#F97316',        // adventure orange (CTA)
    background: '#F0F9FF',    // sky-tinted white
    surface: '#FFFFFF',
    textPrimary: '#0C4A6E',   // deep navy
    textSecondary: '#64748B', // slate
    textMuted: '#94A3B8',
    border: '#CBD5E1',
    borderLight: '#E0F2FE',
    chipBg: '#F8FAFC',
    chipSelectedBg: '#E0F2FE',
    badgeBg: '#E0F2FE',
  },

  typography: {
    // weights
    weightBold: '800' as const,
    weightSemibold: '600' as const,
    weightMedium: '500' as const,
    weightRegular: '400' as const,
    // sizes
    sizeXL: 42,
    sizeLG: 28,
    sizeMD: 18,
    sizeSM: 16,
    sizeXS: 14,
    sizeXXS: 13,
    sizeLabel: 11,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    full: 30,
  },

  shadow: {
    card: {
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
  },

  gradients: {
    hero: ['#0EA5E9', '#0C4A6E'] as const,
    header: ['#0EA5E9', '#0284C7'] as const,
    strip: ['#0EA5E9', '#38BDF8'] as const,
  },
} as const
