import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { palette, radius, shadows, spacing, touch, typography } from "@/themes";
import { BigButton } from "./BigButton";
import type { TemplateResumo } from "@/hooks/useTemplates";

export type TemplatePickerModalProps = {
  visible: boolean;
  templates: TemplateResumo[];
  loading?: boolean;
  onSelect: (templateId: number) => void;
  onSkip: () => void;
  onCancel: () => void;
  testID?: string;
};

export function TemplatePickerModal({
  visible,
  templates,
  loading = false,
  onSelect,
  onSkip,
  onCancel,
  testID,
}: TemplatePickerModalProps) {
  const { bottom } = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) setSelectedId(null);
  }, [visible]);

  const handleConfirm = () => {
    if (selectedId !== null) onSelect(selectedId);
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
          style={styles.backdropTouch}
          onPress={onCancel}
          accessibilityLabel="Fechar"
        />
        <View testID={testID} style={styles.card}>
          <Text style={styles.title}>Escolher modelo</Text>
          <Text style={styles.subtitle}>
            Use um modelo salvo para iniciar a nova planilha com as linhas já
            preenchidas.
          </Text>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={palette.primary} />
            </View>
          ) : templates.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="bookmark-outline"
                size={28}
                color={palette.textMuted}
              />
              <Text style={styles.emptyText}>
                Nenhum modelo salvo ainda. Você pode pular esta etapa.
              </Text>
            </View>
          ) : (
            <FlatList
              data={templates}
              keyExtractor={(item) => String(item.id)}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const active = item.id === selectedId;
                return (
                  <Pressable
                    onPress={() => setSelectedId(item.id)}
                    style={[styles.row, active && styles.rowActive]}
                    hitSlop={touch.hitSlop}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Modelo ${item.nome}`}
                  >
                    <Ionicons
                      name={active ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={active ? palette.primary : palette.textMuted}
                    />
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.nome}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {item.qtd_linhas}{" "}
                        {item.qtd_linhas === 1 ? "linha" : "linhas"}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}

          <View style={styles.actions}>
            <BigButton
              label="Em branco"
              onPress={onSkip}
              variant="secondary"
              disabled={loading}
            />
            <BigButton
              label="Usar modelo"
              onPress={handleConfirm}
              variant="primary"
              disabled={selectedId === null || loading}
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
    maxWidth: 480,
    maxHeight: "85%",
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
  center: { paddingVertical: spacing.xl, alignItems: "center" },
  empty: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: palette.textMuted,
    textAlign: "center",
  },
  list: { maxHeight: 320 },
  listContent: { paddingVertical: spacing.xs },
  separator: { height: spacing.xs },
  row: {
    minHeight: touch.minHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  rowActive: {
    borderColor: palette.primary,
    backgroundColor: palette.surfaceAlt,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    ...typography.bodyStrong,
    color: palette.textPrimary,
  },
  rowMeta: {
    ...typography.caption,
    color: palette.textMuted,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
