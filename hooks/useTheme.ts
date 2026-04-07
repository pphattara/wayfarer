import { useColorScheme } from 'react-native'

export const lightPalette = {
  background: '#ffffff',
  surface: '#f5f5f2',
  text: '#1a1a18',
  subtext: '#6b6b66',
  muted: '#9b9b96',
  border: 'rgba(0,0,0,0.12)',
  primary: '#0F6E56',
  primaryLight: '#E1F5EE',
  accent: '#E8622A',
  amber: '#F5A623',
  card: '#ffffff',
  tabBar: '#ffffff',
  headerBg: '#0F6E56',
  placeholder: '#9b9b96',
} as const

export const darkPalette = {
  background: '#0d0d0d',
  surface: '#1a1a1a',
  text: '#f0f0ee',
  subtext: '#a0a09a',
  muted: '#6b6b66',
  border: 'rgba(255,255,255,0.12)',
  primary: '#1DB984',
  primaryLight: '#0d2a20',
  accent: '#F0733A',
  amber: '#F5A623',
  card: '#1e1e1e',
  tabBar: '#111111',
  headerBg: '#0a3d2b',
  placeholder: '#6b6b66',
} as const

export type ColorPalette = typeof lightPalette

export function useTheme() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  return { colors: isDark ? darkPalette : lightPalette, isDark }
}
