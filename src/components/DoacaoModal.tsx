import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BigButton } from "./BigButton";
import { TextField } from "./TextField";
import { palette, radius, shadows, spacing, typography } from "@/themes";

export type DoacaoModalProps = {
  visible: boolean;
  membroNome: string;
  mesLabel: string;
  initialValue?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (nomeProduto: string) => Promise<void> | void;
};

export function DoacaoModal({
  visible,
  membroNome,
  mesLabel,
  initialValue = "",
  loading = false,
  onCancel,
  onConfirm,
}: DoacaoModalProps) {
  const { bottom } = useSafeAreaInsets();
  const [text, setText] = useState<string>(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setText(initialValue);
      setError(null);
    }
  }, [visible, initialValue]);

  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0 && !loading;

  const handleConfirm = async () => {
    if (trimmed.length === 0) {
      setError("Informe o nome do produto doado");
      return;
    }
    setError(null);
    await onConfirm(trimmed);
  };

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
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityLabel="Fechar"
        />
        <View style={styles.card}>
          <Text style={styles.title}>Registrar doação</Text>
          <Text style={styles.subtitle}>
            {membroNome} · {mesLabel}
          </Text>
          <TextField
            label="Nome do produto doado"
            value={text}
            onChangeText={setText}
            placeholder="Ex: Detergente 500ml"
            helperText="Descreva o produto entregue para registro."
            errorText={error ?? undefined}
            autoFocus
            maxLength={120}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (canSubmit) void handleConfirm();
            }}
          />
          <View style={styles.actions}>
            <BigButton
              label="Cancelar"
              onPress={onCancel}
              variant="secondary"
              disabled={loading}
            />
            <BigButton
              label="Confirmar doação"
              onPress={handleConfirm}
              variant="primary"
              loading={loading}
              disabled={!canSubmit}
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
  subtitle: {
    ...typography.body,
    color: palette.textSecondary,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
