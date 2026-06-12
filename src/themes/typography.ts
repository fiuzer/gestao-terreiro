import type { TextStyle } from 'react-native';

export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' } satisfies TextStyle,
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' } satisfies TextStyle,
  subtitle: { fontSize: 20, lineHeight: 26, fontWeight: '600' } satisfies TextStyle,
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' } satisfies TextStyle,
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: '600' } satisfies TextStyle,
  label: { fontSize: 16, lineHeight: 22, fontWeight: '500' } satisfies TextStyle,
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '400' } satisfies TextStyle,
  button: { fontSize: 18, lineHeight: 24, fontWeight: '700' } satisfies TextStyle,
  money: { fontSize: 22, lineHeight: 28, fontWeight: '700' } satisfies TextStyle,
  moneyLarge: { fontSize: 30, lineHeight: 36, fontWeight: '700' } satisfies TextStyle,
} as const;

export type TypographyVariant = keyof typeof typography;
