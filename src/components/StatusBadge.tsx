import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { palette, radius, spacing, typography } from '@/themes';

export type StatusBadgeStatus = 'paid' | 'pending' | 'overdue' | 'info' | 'neutral' | 'partial' | 'donated';

export type StatusBadgeProps = {
  status: StatusBadgeStatus;
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const PRESETS: Record<StatusBadgeStatus, { label: string; bg: string; fg: string }> = {
  paid: { label: 'Pago', bg: palette.successBg, fg: palette.success },
  pending: { label: 'Pendente', bg: palette.warningBg, fg: palette.warning },
  overdue: { label: 'Atrasado', bg: palette.dangerBg, fg: palette.danger },
  info: { label: 'Info', bg: palette.infoBg, fg: palette.info },
  neutral: { label: '—', bg: palette.surfaceAlt, fg: palette.textSecondary },
  partial: { label: 'Parcial', bg: palette.warningBg, fg: palette.warning },
  donated: { label: 'Doado', bg: palette.donatedBg, fg: palette.donated },
};

export function StatusBadge({ status, label, style, testID }: StatusBadgeProps) {
  const preset = PRESETS[status];
  const text = label ?? preset.label;

  return (
    <View
      testID={testID}
      style={[styles.container, { backgroundColor: preset.bg }, style]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${text}`}
    >
      <Text style={[styles.label, { color: preset.fg }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    minHeight: 28,
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
  },
});
