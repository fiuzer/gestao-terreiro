import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BigButton } from "./BigButton";
import { TextField } from "./TextField";
import { palette, radius, shadows, spacing, typography } from "@/themes";
import type { MembroView } from "@/hooks";

export type MembroFormModalProps = {
  visible: boolean;
  membro: MembroView | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (nome: string) => Promise<void> | void;
};

export function MembroFormModal({
  visible,
  membro,
  loading = false,
  onCancel,
  onConfirm,
}: MembroFormModalProps) {
  const { bottom } = useSafeAreaInsets();
  const [nome, setNome] = useState<string>(membro?.nome ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setNome(membro?.nome ?? "");
      setError(null);
    }
  }, [visible, membro]);

  const handleConfirm = async () => {
    const trimmed = nome.trim();
    if (!trimmed) {
      setError("Informe o nome do membro");
      return;
    }
    setError(null);
    await onConfirm(trimmed);
  };

  const title = membro ? "Editar membro" : "Novo membro";

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
          <Text style={styles.title}>{title}</Text>
          <TextField
            label="Nome"
            value={nome}
            onChangeText={setNome}
            placeholder="Nome do filho-de-santo"
            autoFocus
            autoCapitalize="words"
            errorText={error ?? undefined}
          />
          <View style={styles.actions}>
            <BigButton
              label="Cancelar"
              onPress={onCancel}
              variant="secondary"
              disabled={loading}
            />
            <BigButton
              label="Salvar"
              onPress={handleConfirm}
              variant="primary"
              loading={loading}
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
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
