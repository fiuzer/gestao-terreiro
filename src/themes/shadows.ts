import type { ViewStyle } from 'react-native';

export const shadows = {
  none: {} satisfies ViewStyle,
  sm: {
    shadowColor: '#1A1024',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  } satisfies ViewStyle,
  md: {
    shadowColor: '#1A1024',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  } satisfies ViewStyle,
  lg: {
    shadowColor: '#1A1024',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  } satisfies ViewStyle,
} as const;

export type ShadowName = keyof typeof shadows;
