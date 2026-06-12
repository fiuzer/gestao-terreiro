export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const touch = {
  minHeight: 56,
  iconButton: 48,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

export type SpacingToken = keyof typeof spacing;
