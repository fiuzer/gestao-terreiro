import { StyleSheet, Text, TextInput, View } from "react-native";
import type { StyleProp, TextInputProps, ViewStyle } from "react-native";
import { palette, radius, spacing, touch, typography } from "@/themes";

export type TextFieldProps = Omit<TextInputProps, "style"> & {
  label?: string;
  helperText?: string;
  errorText?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  helperText,
  errorText,
  containerStyle,
  ...inputProps
}: TextFieldProps) {
  const hasError = Boolean(errorText);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...inputProps}
        placeholderTextColor={palette.textMuted}
        style={[styles.input, hasError && styles.inputError]}
        accessibilityLabel={inputProps.accessibilityLabel ?? label}
      />
      {hasError ? (
        <Text style={styles.error}>{errorText}</Text>
      ) : helperText ? (
        <Text style={styles.helper}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: palette.textPrimary,
  },
  input: {
    ...typography.body,
    minHeight: touch.minHeight,
    color: palette.textPrimary,
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputError: {
    borderColor: palette.danger,
  },
  helper: {
    ...typography.caption,
    color: palette.textMuted,
  },
  error: {
    ...typography.caption,
    color: palette.danger,
    fontWeight: "600",
  },
});
