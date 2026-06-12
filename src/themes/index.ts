import { palette } from './colors';
import { spacing, radius, touch } from './spacing';
import { typography } from './typography';
import { shadows } from './shadows';

export { palette } from './colors';
export type { ColorName } from './colors';
export { spacing, radius, touch } from './spacing';
export type { SpacingToken } from './spacing';
export { typography } from './typography';
export type { TypographyVariant } from './typography';
export { shadows } from './shadows';
export type { ShadowName } from './shadows';

export const theme = {
  colors: palette,
  spacing,
  radius,
  touch,
  typography,
  shadows,
} as const;

export type Theme = typeof theme;
