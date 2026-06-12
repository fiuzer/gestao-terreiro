import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  ConfirmDialog,
  EmptyState,
  NomeInputDialog,
  SectionHeader,
} from "@/components";
import { palette, radius, spacing, touch, typography } from "@/themes";
import { useConfiguracoes } from "@/hooks";
import { useTemplates } from "@/hooks/useTemplates";
import type { TemplateResumo } from "@/hooks/useTemplates";
import type { MaisStackParamList } from "@/navigation/AppNavigator";
import { parseMoneyInput } from "@/utils/format";

type Nav = NativeStackNavigationProp<MaisStackParamList, "MaisHome">;

export function MaisScreen() {
  const navigation = useNavigation<Nav>();
  const {
    templates,
    loading,
    error,
    reload,
    renomearTemplate,
    excluirTemplate,
  } = useTemplates();

  const [renaming, setRenaming] = useState<TemplateResumo | null>(null);
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TemplateResumo | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const confirmarRenome = async (nome: string) => {
    if (!renaming) return;
    setRenameLoading(true);
    setRenameError(null);
    try {
      await renomearTemplate(renaming.id, nome);
      setRenaming(null);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : "Falha ao renomear.");
    } finally {
      setRenameLoading(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await excluirTemplate(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && templates.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <View style={styles.headerStack}>
              <ConfiguracoesSection />
              <EventosSection onPress={() => navigation.navigate("Eventos")} />
              <SectionHeader
                title="Modelos de planilha"
                description="Crie planilhas pré-formatadas reutilizando estruturas que você já usa."
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="Nenhum modelo salvo"
              description={
                "Em uma planilha, toque em \"Salvar como modelo\" para reutilizá-la depois."
              }
            />
          }
          renderItem={({ item }) => (
            <TemplateRow
              template={item}
              onRename={() => {
                setRenameError(null);
                setRenaming(item);
              }}
              onDelete={() => setPendingDelete(item)}
            />
          )}
        />
      )}

      <NomeInputDialog
        visible={renaming !== null}
        title="Renomear modelo"
        initialValue={renaming?.nome ?? ""}
        confirmLabel="Salvar"
        loading={renameLoading}
        onConfirm={confirmarRenome}
        onCancel={() => setRenaming(null)}
      />

      {renameError ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{renameError}</Text>
        </View>
      ) : null}

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Excluir modelo?"
        message={
          pendingDelete
            ? `O modelo “${pendingDelete.nome}” será removido. Planilhas já criadas a partir dele não são afetadas.`
            : undefined
        }
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={confirmarExclusao}
        onCancel={() => setPendingDelete(null)}
      />
    </SafeAreaView>
  );
}

function EventosSection({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.eventosSectionWrap}>
      <SectionHeader
        title="Eventos & Temporários"
        description="Planilhas para bingos, rifas e outros eventos. Podem ser excluídas quando não forem mais necessárias."
      />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Abrir eventos"
        style={({ pressed }) => [
          styles.eventosBtn,
          pressed && styles.eventosBtnPressed,
        ]}
      >
        <View style={styles.eventosBtnIcon}>
          <Ionicons name="document-text" size={22} color={palette.primary} />
        </View>
        <View style={styles.eventosBtnBody}>
          <Text style={styles.eventosBtnTitle}>Minhas planilhas de eventos</Text>
          <Text style={styles.eventosBtnSub}>
            Criar, visualizar e excluir planilhas temporárias
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={palette.textMuted}
        />
      </Pressable>
    </View>
  );
}

function numberToInputText(valor: number): string {
  if (!Number.isFinite(valor) || valor <= 0) return "";
  return valor.toFixed(2).replace(".", ",");
}

function ConfiguracoesSection() {
  const {
    valorMensalidade,
    valorProduto,
    setValorMensalidade,
    setValorProduto,
  } = useConfiguracoes();

  return (
    <View style={styles.configWrap}>
      <SectionHeader
        title="Configurações"
        description="Valores padrão usados ao registrar novos pagamentos."
      />
      <View style={styles.configCard}>
        <ConfiguracaoField
          label="Mensalidade padrão (R$)"
          valor={valorMensalidade}
          onSave={setValorMensalidade}
        />
        <View style={styles.configDivider} />
        <ConfiguracaoField
          label="Produtos de limpeza padrão (R$)"
          valor={valorProduto}
          onSave={setValorProduto}
        />
      </View>
    </View>
  );
}

function ConfiguracaoField({
  label,
  valor,
  onSave,
}: {
  label: string;
  valor: number;
  onSave: (n: number) => Promise<void>;
}) {
  const [text, setText] = useState<string>(numberToInputText(valor));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setText(numberToInputText(valor));
  }, [valor]);

  const handleBlur = async () => {
    const parsed = parseMoneyInput(text);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setErro("Valor inválido. Use formato 0,00.");
      setText(numberToInputText(valor));
      return;
    }
    if (parsed === valor) {
      setErro(null);
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await onSave(parsed);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar.");
      setText(numberToInputText(valor));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <View style={styles.configField}>
      <Text style={styles.configLabel}>{label}</Text>
      <View style={styles.configInputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={() => void handleBlur()}
          placeholder="0,00"
          placeholderTextColor={palette.textMuted}
          keyboardType="decimal-pad"
          editable={!salvando}
          style={[styles.configInput, erro ? styles.configInputError : null]}
          accessibilityLabel={label}
        />
        {salvando ? (
          <ActivityIndicator size="small" color={palette.primary} />
        ) : null}
      </View>
      {erro ? <Text style={styles.configErrorText}>{erro}</Text> : null}
    </View>
  );
}

function TemplateRow({
  template,
  onRename,
  onDelete,
}: {
  template: TemplateResumo;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name="bookmark" size={20} color={palette.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {template.nome}
        </Text>
        <Text style={styles.rowMeta}>
          {template.qtd_linhas}{" "}
          {template.qtd_linhas === 1 ? "linha" : "linhas"}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={onRename}
          hitSlop={touch.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={`Renomear ${template.nome}`}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.actionBtnPressed,
          ]}
        >
          <Ionicons name="create-outline" size={20} color={palette.primary} />
        </Pressable>
        <Pressable
          onPress={onDelete}
          hitSlop={touch.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={`Excluir ${template.nome}`}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.actionBtnDangerPressed,
          ]}
        >
          <Ionicons name="trash-outline" size={20} color={palette.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  headerStack: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.huge,
    flexGrow: 1,
  },
  separator: { height: spacing.sm },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.huge,
  },
  errorBox: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    padding: spacing.md,
    backgroundColor: palette.dangerBg,
    borderRadius: radius.md,
  },
  errorText: {
    ...typography.body,
    color: palette.danger,
  },
  eventosSectionWrap: {
    gap: spacing.sm,
  },
  eventosBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: touch.minHeight,
  },
  eventosBtnPressed: {
    backgroundColor: palette.surfaceAlt,
  },
  eventosBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  eventosBtnBody: {
    flex: 1,
    gap: 2,
  },
  eventosBtnTitle: {
    ...typography.bodyStrong,
    color: palette.textPrimary,
  },
  eventosBtnSub: {
    ...typography.caption,
    color: palette.textMuted,
  },
  configWrap: {
    gap: spacing.sm,
  },
  configCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  configDivider: {
    height: 1,
    backgroundColor: palette.border,
  },
  configField: {
    gap: spacing.xs,
  },
  configLabel: {
    ...typography.label,
    color: palette.textPrimary,
  },
  configInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  configInput: {
    flex: 1,
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
  configInputError: {
    borderColor: palette.danger,
  },
  configErrorText: {
    ...typography.caption,
    color: palette.danger,
    fontWeight: "600",
  },
  row: {
    minHeight: touch.minHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: {
    ...typography.bodyStrong,
    color: palette.textPrimary,
  },
  rowMeta: {
    ...typography.caption,
    color: palette.textMuted,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  actionBtn: {
    width: touch.iconButton,
    height: touch.iconButton,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  actionBtnPressed: { backgroundColor: palette.surfaceAlt },
  actionBtnDangerPressed: { backgroundColor: palette.dangerBg },
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: palette.dangerBg,
    borderRadius: radius.md,
  },
  toastText: {
    ...typography.body,
    color: palette.danger,
  },
});
