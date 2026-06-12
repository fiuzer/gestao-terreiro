import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { palette, radius, shadows, spacing, touch, typography } from '@/themes';

export type BigButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';

export type BigButtonProps = {
  label: string;
  onPress: () => void;
  variant?: BigButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
};

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  leftIcon,
  fullWidth = true,
  style,
  testID,
  accessibilityLabel,
}: BigButtonProps) {
  const isInactive = disabled || loading;
  const variantStyles = VARIANTS[variant];

  const pressableProps: PressableProps = {
    onPress: isInactive ? undefined : onPress,
    disabled: isInactive,
    hitSlop: touch.hitSlop,
    accessibilityRole: 'button',
    accessibilityLabel: accessibilityLabel ?? label,
    accessibilityState: { disabled: isInactive, busy: loading },
    testID,
  };

  return (
    <Pressable
      {...pressableProps}
      style={({ pressed }) => [
        styles.base,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        pressed && !isInactive && styles.pressed,
        isInactive && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variantStyles.label.color} />
        ) : (
          <>
            {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
            <Text style={[styles.label, variantStyles.label]} numberOfLines={1}>
              {label}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.minHeight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  iconSlot: {
    marginRight: spacing.xs,
  },
  label: {
    ...typography.button,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
  },
});

const VARIANTS: Record<BigButtonVariant, { container: ViewStyle; label: { color: string } }> = {
  primary: {
    container: { backgroundColor: palette.primary },
    label: { color: palette.textOnPrimary },
  },
  secondary: {
    container: {
      backgroundColor: palette.surface,
      borderWidth: 2,
      borderColor: palette.primary,
    },
    label: { color: palette.primary },
  },
  accent: {
    container: { backgroundColor: palette.accent },
    label: { color: palette.white },
  },
  danger: {
    container: { backgroundColor: palette.danger },
    label: { color: palette.white },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    label: { color: palette.primary },
  },
};
