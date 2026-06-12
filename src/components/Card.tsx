import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { palette, radius, shadows, spacing } from '@/themes';

export type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  tone?: 'default' | 'highlight';
  testID?: string;
};

export function Card({ children, style, padded = true, tone = 'default', testID }: CardProps) {
  return (
    <View
      testID={testID}
      style={[
        styles.base,
        padded && styles.padded,
        tone === 'highlight' && styles.highlight,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.sm,
  },
  padded: {
    padding: spacing.lg,
  },
  highlight: {
    backgroundColor: palette.surfaceAlt,
    borderColor: palette.borderStrong,
  },
});
