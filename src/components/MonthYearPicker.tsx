import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { palette, radius, spacing, touch, typography } from '@/themes';
import { addMonths, formatMonthYear } from '@/utils/format';

export type MonthYearValue = { month: number; year: number };

export type MonthYearPickerProps = {
  value: MonthYearValue;
  onChange: (value: MonthYearValue) => void;
  minYear?: number;
  maxYear?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function MonthYearPicker({
  value,
  onChange,
  minYear,
  maxYear,
  style,
  testID,
}: MonthYearPickerProps) {
  const handlePrev = () => {
    const next = addMonths(value.month, value.year, -1);
    if (minYear !== undefined && next.year < minYear) return;
    onChange(next);
  };

  const handleNext = () => {
    const next = addMonths(value.month, value.year, 1);
    if (maxYear !== undefined && next.year > maxYear) return;
    onChange(next);
  };

  const prevDisabled = minYear !== undefined && value.year <= minYear && value.month <= 1;
  const nextDisabled = maxYear !== undefined && value.year >= maxYear && value.month >= 12;

  return (
    <View testID={testID} style={[styles.container, style]}>
      <Pressable
        onPress={handlePrev}
        disabled={prevDisabled}
        hitSlop={touch.hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Mês anterior"
        style={({ pressed }) => [
          styles.arrow,
          pressed && !prevDisabled && styles.arrowPressed,
          prevDisabled && styles.arrowDisabled,
        ]}
      >
        <Text style={styles.arrowText}>{'‹'}</Text>
      </Pressable>

      <View style={styles.label}>
        <Text style={styles.labelText} numberOfLines={1}>
          {formatMonthYear(value.month, value.year)}
        </Text>
      </View>

      <Pressable
        onPress={handleNext}
        disabled={nextDisabled}
        hitSlop={touch.hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Próximo mês"
        style={({ pressed }) => [
          styles.arrow,
          pressed && !nextDisabled && styles.arrowPressed,
          nextDisabled && styles.arrowDisabled,
        ]}
      >
        <Text style={styles.arrowText}>{'›'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: touch.minHeight,
    overflow: 'hidden',
  },
  arrow: {
    width: touch.iconButton,
    height: touch.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  arrowPressed: {
    backgroundColor: palette.primaryDark,
  },
  arrowDisabled: {
    backgroundColor: palette.borderStrong,
  },
  arrowText: {
    color: palette.white,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
  label: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  labelText: {
    ...typography.subtitle,
    color: palette.textPrimary,
    textAlign: 'center',
  },
});
