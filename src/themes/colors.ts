export const palette = {
  primary: '#4A148C',
  primaryDark: '#311070',
  primaryLight: '#6A1B9A',
  primaryLighter: '#7B1FA2',

  accent: '#FF8F00',
  accentDark: '#E07A00',
  accentLight: '#FFB74D',

  white: '#FFFFFF',
  background: '#F5F2F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EAF5',

  textPrimary: '#1A1024',
  textSecondary: '#4F4159',
  textOnPrimary: '#FFFFFF',
  textMuted: '#7A6F85',
  textDisabled: '#B0A8B9',

  border: '#E0D6E8',
  borderStrong: '#C5B6D2',

  success: '#2E7D32',
  successBg: '#E6F4E7',
  danger: '#C62828',
  dangerBg: '#FCE8E8',
  warning: '#F57C00',
  warningBg: '#FFF1DC',
  info: '#1565C0',
  infoBg: '#E3EEF9',
  donated: '#6A1B9A',
  donatedBg: '#EDE7F6',

  overlay: 'rgba(26, 16, 36, 0.55)',
} as const;

export type ColorName = keyof typeof palette;
