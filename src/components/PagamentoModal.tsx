import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BigButton } from "./BigButton";
import { TextField } from "./TextField";
import { palette, radius, shadows, spacing, typography } from "@/themes";
import { formatMoney, parseMoneyInput } from "@/utils/format";

export type PagamentoModalProps = {
  visible: boolean;
  membroNome: string;
  mesLabel: string;
  valorInicial: number;
  valorMaximo?: number;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (valor: number) => Promise<void> | void;
};

export function PagamentoModal({
  visible,
  membroNome,
  mesLabel,
  valorInicial,
  valorMaximo,
  loading = false,
  onCancel,
  onConfirm,
}: PagamentoModalProps) {
  const { bottom } = useSafeAreaInsets();
  const initialText = useMemo(
    () => (valorInicial > 0 ? valorInicial.toFixed(2).replace(".", ",") : ""),
    [valorInicial]
  );
  const [text, setText] = useState<string>(initialText);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setText(initialText);
      setError(null);
    }
  }, [visible, initialText]);

  const parsed = parseMoneyInput(text);
  const temMaximo =
    typeof valorMaximo === "number" && Number.isFinite(valorMaximo);
  const excedeMaximo =
    temMaximo && Number.isFinite(parsed) && parsed > (valorMaximo as number);
  const canSubmit =
    Number.isFinite(parsed) && parsed >= 0 && !excedeMaximo && !loading;

  const handleConfirm = async () => {
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Informe um valor válido");
      return;
    }
    if (temMaximo && parsed > (valorMaximo as number)) {
      setError(`Valor não pode exceder ${formatMoney(valorMaximo as number)}`);
      return;
    }
    setError(null);
    await onConfirm(parsed);
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
          <Text style={styles.title}>Registrar pagamento</Text>
          <Text style={styles.subtitle}>
            {membroNome} · {mesLabel}
          </Text>
          <TextField
            label="Valor pago"
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            placeholder="0,00"
            helperText={
              temMaximo
                ? `Saldo restante: ${formatMoney(valorMaximo as number)}`
                : Number.isFinite(parsed) && parsed > 0
                  ? `Equivale a ${formatMoney(parsed)}`
                  : "Digite o valor recebido"
            }
            errorText={error ?? undefined}
            autoFocus
          />
          <View style={styles.actions}>
            <BigButton
              label="Cancelar"
              onPress={onCancel}
              variant="secondary"
              disabled={loading}
            />
            <BigButton
              label="Confirmar pagamento"
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
