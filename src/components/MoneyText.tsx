import { StyleSheet, Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { palette, typography } from '@/themes';
import { formatMoney } from '@/utils/format';

export type MoneyTextProps = {
  value: number | null | undefined;
  size?: 'normal' | 'large';
  tone?: 'default' | 'positive' | 'negative' | 'muted' | 'accent';
  style?: StyleProp<TextStyle>;
  testID?: string;
};

export function MoneyText({
  value,
  size = 'normal',
  tone = 'default',
  style,
  testID,
}: MoneyTextProps) {
  return (
    <Text
      testID={testID}
      style={[
        size === 'large' ? styles.large : styles.normal,
        TONES[tone],
        style,
      ]}
      accessibilityLabel={`Valor ${formatMoney(value)}`}
    >
      {formatMoney(value)}
    </Text>
  );
}

const styles = StyleSheet.create({
  normal: typography.money,
  large: typography.moneyLarge,
});

const TONES: Record<NonNullable<MoneyTextProps['tone']>, TextStyle> = {
  default: { color: palette.textPrimary },
  positive: { color: palette.success },
  negative: { color: palette.danger },
  muted: { color: palette.textMuted },
  accent: { color: palette.accent },
};
