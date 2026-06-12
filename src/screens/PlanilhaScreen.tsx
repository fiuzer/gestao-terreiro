import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Avatar,
  Card,
  ConfirmDialog,
  EmptyState,
  ListItem,
  MoneyText,
  NomeInputDialog,
  PagamentoModal,
  SearchBar,
  StatusBadge,
} from "@/components";
import { palette, radius, shadows, spacing, touch, typography } from "@/themes";
import { formatMoney, formatMonthYear } from "@/utils/format";
import { usePlanilha, type PlanilhaTotais } from "@/hooks/usePlanilha";
import { useTemplates } from "@/hooks/useTemplates";
import { useExport } from "@/hooks/useExport";
import {
  compartilharViaWhatsApp,
  gerarTextoResumoPlanilha,
} from "@/utils/pdf";
import type { LinhaPlanilha } from "@/types/models";
import type { PlanilhaRoutes } from "@/navigation/types";

type Nav = NativeStackNavigationProp<PlanilhaRoutes, "PlanilhaDetail">;
type RouteParams = RouteProp<PlanilhaRoutes, "PlanilhaDetail">;

export function PlanilhaScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const { planilhaId } = route.params;

  const {
    planilha,
    linhas,
    totais,
    loading,
    error,
    reload,
    registrarPagamento,
    addLinhaAvulsa,
    deleteLinha,
  } = usePlanilha(planilhaId);
  const { salvarComoTemplate } = useTemplates();
  const {
    exportarPlanilha,
    exporting: exportando,
    error: exportError,
  } = useExport();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const [pagamentoTarget, setPagamentoTarget] = useState<LinhaPlanilha | null>(
    null
  );
  const [pagamentoLoading, setPagamentoLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<LinhaPlanilha | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [adicionarDialog, setAdicionarDialog] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [salvandoTemplate, setSalvandoTemplate] = useState(false);
  const [templateFeedback, setTemplateFeedback] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return linhas;
    return linhas.filter((l) => l.nome.toLowerCase().includes(termo));
  }, [linhas, busca]);

  const subtitulo = useMemo(() => {
    if (!planilha) return "";
    if (planilha.mes && planilha.ano) {
      return formatMonthYear(planilha.mes, planilha.ano);
    }
    return "";
  }, [planilha]);

  const handleItemPress = (linha: LinhaPlanilha) => {
    setPagamentoTarget(linha);
  };

  const handleConfirmPagamento = async (valor: number) => {
    if (!pagamentoTarget) return;
    setPagamentoLoading(true);
    try {
      await registrarPagamento(pagamentoTarget.id, valor);
      setPagamentoTarget(null);
    } finally {
      setPagamentoLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteLinha(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const confirmarAdicionar = async (nome: string) => {
    const trimmed = nome.trim();
    if (!trimmed) {
      setAdicionarDialog(false);
      return;
    }
    setAdicionando(true);
    try {
      await addLinhaAvulsa(trimmed);
      setAdicionarDialog(false);
    } finally {
      setAdicionando(false);
    }
  };

  const confirmarSalvarTemplate = async (nome: string) => {
    setSalvandoTemplate(true);
    setTemplateFeedback(null);
    try {
      await salvarComoTemplate(planilhaId, nome);
      setTemplateDialog(false);
      setTemplateFeedback("Modelo salvo com sucesso.");
    } catch (e) {
      setTemplateFeedback(
        e instanceof Error ? e.message : "Falha ao salvar modelo."
      );
    } finally {
      setSalvandoTemplate(false);
    }
  };

  const handleExportar = async () => {
    try {
      await exportarPlanilha(planilhaId);
    } catch {
      // useExport já expõe o erro via exportError
    }
  };

  const handleEnviarWhatsApp = async () => {
    if (!planilha) return;
    try {
      const texto = gerarTextoResumoPlanilha(planilha, linhas, totais);
      await compartilharViaWhatsApp(texto);
    } catch (e) {
      Alert.alert(
        "WhatsApp indisponível",
        e instanceof Error ? e.message : "Não foi possível abrir o WhatsApp."
      );
    }
  };

  const handleCompartilhar = () => {
    Alert.alert("Compartilhar", "Como você quer compartilhar?", [
      { text: "Compartilhar PDF", onPress: () => void handleExportar() },
      { text: "Enviar no WhatsApp", onPress: () => void handleEnviarWhatsApp() },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  if (loading && linhas.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const saldoRestante = pagamentoTarget
    ? Math.max(pagamentoTarget.valor_cobrado - pagamentoTarget.valor_pago, 0)
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {planilha?.nome ?? "Planilha"}
            </Text>
            {subtitulo ? (
              <Text style={styles.headerSub}>{subtitulo}</Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              setTemplateFeedback(null);
              setTemplateDialog(true);
            }}
            hitSlop={touch.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Salvar como modelo"
            style={({ pressed }) => [
              styles.headerAction,
              pressed && styles.headerActionPressed,
            ]}
          >
            <Ionicons
              name="bookmark-outline"
              size={18}
              color={palette.primary}
            />
            <Text style={styles.headerActionLabel}>Modelo</Text>
          </Pressable>
        </View>
        {templateFeedback ? (
          <Text style={styles.headerFeedback}>{templateFeedback}</Text>
        ) : null}
      </View>

      <ResumoTotais totais={totais} />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {exportError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{exportError}</Text>
        </View>
      ) : null}

      {linhas.length > 0 ? (
        <View style={styles.searchWrap}>
          <SearchBar
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar pessoa..."
          />
        </View>
      ) : null}

      <FlatList
        data={linhasFiltradas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={loading}
        onRefresh={() => void reload()}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          linhas.length === 0 ? (
            <EmptyState
              title="Sem pessoas"
              description="Adicione uma pessoa para começar a registrar pagamentos."
              actionLabel="Adicionar pessoa"
              onAction={() => setAdicionarDialog(true)}
            />
          ) : (
            <EmptyState
              title="Nenhum resultado"
              description={`Nenhuma pessoa encontrada para "${busca}".`}
            />
          )
        }
        renderItem={({ item }) => (
          <LinhaItem
            linha={item}
            onPress={() => handleItemPress(item)}
            onLongPress={() => setPendingDelete(item)}
          />
        )}
      />

      <View style={styles.actionsBar}>
        <Pressable
          onPress={() => setAdicionarDialog(true)}
          accessibilityRole="button"
          accessibilityLabel="Adicionar pessoa"
          style={({ pressed }) => [
            styles.actionBtn,
            styles.actionBtnSecondary,
            pressed && styles.actionBtnPressed,
          ]}
          hitSlop={touch.hitSlop}
        >
          <Ionicons name="person-add" size={20} color={palette.primary} />
          <Text style={styles.actionLabelSecondary}>Adicionar pessoa</Text>
        </Pressable>
        <Pressable
          onPress={handleCompartilhar}
          disabled={exportando}
          accessibilityRole="button"
          accessibilityLabel="Compartilhar"
          style={({ pressed }) => [
            styles.actionBtn,
            styles.actionBtnPrimary,
            pressed && !exportando && styles.actionBtnPressed,
            exportando && styles.actionBtnDisabled,
          ]}
          hitSlop={touch.hitSlop}
        >
          {exportando ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <>
              <Ionicons
                name="share-social"
                size={20}
                color={palette.white}
              />
              <Text style={styles.actionLabelPrimary}>Compartilhar</Text>
            </>
          )}
        </Pressable>
      </View>

      <PagamentoModal
        visible={pagamentoTarget !== null}
        membroNome={pagamentoTarget?.nome ?? ""}
        mesLabel={subtitulo || (planilha?.nome ?? "")}
        valorInicial={saldoRestante}
        loading={pagamentoLoading}
        onCancel={() => setPagamentoTarget(null)}
        onConfirm={handleConfirmPagamento}
      />

      <NomeInputDialog
        visible={adicionarDialog}
        title="Adicionar pessoa"
        placeholder="Nome da pessoa"
        confirmLabel="Adicionar"
        loading={adicionando}
        onConfirm={confirmarAdicionar}
        onCancel={() => setAdicionarDialog(false)}
      />

      <NomeInputDialog
        visible={templateDialog}
        title="Salvar como modelo"
        placeholder="Nome do modelo (ex.: Festa anual)"
        initialValue={planilha?.nome ?? ""}
        confirmLabel="Salvar"
        loading={salvandoTemplate}
        onConfirm={confirmarSalvarTemplate}
        onCancel={() => setTemplateDialog(false)}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Excluir pessoa da planilha?"
        message={
          pendingDelete
            ? `“${pendingDelete.nome}” será removido. Esta ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </SafeAreaView>
  );
}

function statusBadgeFor(status: LinhaPlanilha["status"]) {
  if (status === "pago") return { status: "paid" as const, label: "Pago" };
  if (status === "parcial")
    return { status: "pending" as const, label: "Parcial" };
  return { status: "overdue" as const, label: "Pendente" };
}

function LinhaItem({
  linha,
  onPress,
  onLongPress,
}: {
  linha: LinhaPlanilha;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const saldo = Math.max(linha.valor_cobrado - linha.valor_pago, 0);
  const isPago = linha.status === "pago";
  const isParcial = linha.status === "parcial";
  const badge = statusBadgeFor(linha.status);

  const subtitle = isPago
    ? `Pago ${formatMoney(linha.valor_pago)}`
    : isParcial
      ? `Pago ${formatMoney(linha.valor_pago)} · falta ${formatMoney(saldo)}`
      : "Toque para registrar pagamento";

  const avatarTone = isPago ? "accent" : isParcial ? "primary" : "primary";
  const moneyTone = isPago ? "positive" : isParcial ? "muted" : "muted";

  return (
    <ListItem
      title={linha.nome}
      subtitle={subtitle}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`${linha.nome}, status ${badge.label}`}
      leading={<Avatar name={linha.nome} tone={avatarTone} />}
      trailing={
        <View style={styles.trailing}>
          <MoneyText value={linha.valor_cobrado} tone={moneyTone} />
          <StatusBadge status={badge.status} label={badge.label} />
        </View>
      }
    />
  );
}

function ResumoTotais({ totais }: { totais: PlanilhaTotais }) {
  return (
    <Card style={styles.resumo}>
      <View style={styles.resumoCol}>
        <Text style={styles.resumoLabel}>Cobrado</Text>
        <MoneyText value={totais.totalCobrado} tone="muted" />
      </View>
      <View style={styles.resumoDivider} />
      <View style={styles.resumoCol}>
        <Text style={styles.resumoLabel}>Pago</Text>
        <MoneyText value={totais.totalPago} tone="positive" />
      </View>
      <View style={styles.resumoDivider} />
      <View style={styles.resumoCol}>
        <Text style={styles.resumoLabel}>Pendente</Text>
        <MoneyText value={totais.totalPendente} tone="negative" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  headerTitle: {
    ...typography.title,
    color: palette.textPrimary,
  },
  headerSub: {
    ...typography.body,
    color: palette.textSecondary,
  },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },
  headerActionPressed: { backgroundColor: palette.surfaceAlt },
  headerActionLabel: {
    ...typography.label,
    color: palette.primary,
  },
  headerFeedback: {
    ...typography.caption,
    color: palette.success,
  },
  resumo: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    ...shadows.sm,
  },
  resumoCol: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  resumoDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: palette.border,
  },
  resumoLabel: {
    ...typography.caption,
    color: palette.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.huge,
    flexGrow: 1,
  },
  separator: { height: spacing.sm },
  trailing: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  actionsBar: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
  },
  actionBtn: {
    flex: 1,
    minHeight: touch.minHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  actionBtnSecondary: {
    backgroundColor: palette.surface,
    borderWidth: 2,
    borderColor: palette.primary,
  },
  actionBtnPrimary: {
    backgroundColor: palette.primary,
  },
  actionBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  actionBtnDisabled: {
    opacity: 0.7,
  },
  actionLabelSecondary: {
    ...typography.button,
    color: palette.primary,
  },
  actionLabelPrimary: {
    ...typography.button,
    color: palette.white,
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
});
