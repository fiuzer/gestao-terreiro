import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, radius, shadows, spacing, touch, typography } from "@/themes";
import { BigButton } from "./BigButton";

export type NomeInputDialogProps = {
  visible: boolean;
  title: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: (nome: string) => void;
  onCancel: () => void;
  testID?: string;
};

export function NomeInputDialog({
  visible,
  title,
  initialValue = "",
  placeholder,
  confirmLabel = "Salvar",
  cancelLabel = "Cancelar",
  loading = false,
  onConfirm,
  onCancel,
  testID,
}: NomeInputDialogProps) {
  const { bottom } = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const trimmed = value.trim();
  const disabled = trimmed.length === 0 || loading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { paddingBottom: spacing.xl + bottom }]}>
        <Pressable
          style={styles.backdropTouch}
          onPress={onCancel}
          accessibilityLabel="Fechar"
        />
        <View testID={testID} style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={palette.textMuted}
            autoFocus
            style={styles.input}
            maxLength={120}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (!disabled) onConfirm(trimmed);
            }}
          />
          <View style={styles.actions}>
            <BigButton
              label={cancelLabel}
              onPress={onCancel}
              variant="secondary"
              disabled={loading}
            />
            <BigButton
              label={confirmLabel}
              onPress={() => onConfirm(trimmed)}
              variant="primary"
              loading={loading}
              disabled={disabled}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: palette.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  backdropTouch: { ...StyleSheet.absoluteFillObject },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    gap: spacing.lg,
    ...shadows.lg,
  },
  title: {
    ...typography.title,
    color: palette.textPrimary,
  },
  input: {
    minHeight: touch.minHeight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    color: palette.textPrimary,
    ...typography.body,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
