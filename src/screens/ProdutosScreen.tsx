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
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Avatar,
  Card,
  ConfirmDialog,
  DoacaoModal,
  EmptyState,
  FAB,
  ListItem,
  MoneyText,
  MonthYearPicker,
  NomeInputDialog,
  PagamentoModal,
  PeriodoPickerModal,
  ScreenContainer,
  SearchBar,
  StatusBadge,
} from "@/components";
import type { StatusBadgeStatus } from "@/components";
import { useConfiguracoes, useProdutos } from "@/hooks";
import type { ProdutoRow } from "@/hooks";
import { useExport } from "@/hooks/useExport";
import type { ProdutosStackParamList } from "@/navigation/AppNavigator";
import { palette, radius, spacing, touch, typography } from "@/themes";
import { formatDateBR, formatMoney, formatMonthYear, parseMoneyInput } from "@/utils/format";

type Props = NativeStackScreenProps<ProdutosStackParamList, "ProdutosHome">;

function todayMonthYear(): { mes: number; ano: number } {
  const now = new Date();
  return { mes: now.getMonth() + 1, ano: now.getFullYear() };
}

function adimplenciaColor(percent: number): string {
  if (percent >= 80) return palette.success;
  if (percent >= 50) return palette.warning;
  return palette.danger;
}

function statusParaBadge(status: string): StatusBadgeStatus {
  if (status === "pago") return "paid";
  if (status === "parcial") return "partial";
  if (status === "doado") return "donated";
  return "pending";
}

export function ProdutosScreen({ navigation }: Props) {
  const initial = todayMonthYear();
  const [periodo, setPeriodo] = useState(initial);
  const { valorProduto } = useConfiguracoes();
  const {
    rows,
    totais,
    loading,
    error,
    reload,
    registrarPagamento,
    registrarDoacao,
    marcarPendente,
    definirCotaPadrao,
  } = useProdutos(periodo.mes, periodo.ano, valorProduto);
  const [periodoPickerVisible, setPeriodoPickerVisible] = useState(false);
  const {
    exportarProdutos,
    exportarProdutosMultiMes,
    compartilharResumoProdutosMultiMes,
    exporting,
  } = useExport();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const [pagamentoTarget, setPagamentoTarget] = useState<ProdutoRow | null>(null);
  const [pagamentoLoading, setPagamentoLoading] = useState(false);
  const [reverterTarget, setReverterTarget] = useState<ProdutoRow | null>(null);
  const [reverterLoading, setReverterLoading] = useState(false);
  const [doacaoTarget, setDoacaoTarget] = useState<ProdutoRow | null>(null);
  const [doacaoLoading, setDoacaoLoading] = useState(false);
  const [cotaDialog, setCotaDialog] = useState(false);
  const [cotaSalvando, setCotaSalvando] = useState(false);
  const [cotaFeedback, setCotaFeedback] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const rowsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return rows;
    return rows.filter((r) => r.membro_nome.toLowerCase().includes(termo));
  }, [rows, busca]);

  const handleItemPress = (row: ProdutoRow) => {
    if (row.status === "pago" || row.status === "doado") {
      setReverterTarget(row);
      return;
    }
    Alert.alert(
      row.membro_nome,
      `${formatMonthYear(periodo.mes, periodo.ano)} — o que deseja registrar?`,
      [
        {
          text: "Pagou em dinheiro",
          onPress: () => setPagamentoTarget(row),
        },
        {
          text: "Doou um produto",
          onPress: () => setDoacaoTarget(row),
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  const handleConfirmPagamento = async (valor: number) => {
    if (!pagamentoTarget) return;
    setPagamentoLoading(true);
    try {
      await registrarPagamento({
        membroId: pagamentoTarget.membro_id,
        mes: periodo.mes,
        ano: periodo.ano,
        valor,
      });
      setPagamentoTarget(null);
    } finally {
      setPagamentoLoading(false);
    }
  };

  const handleConfirmDoacao = async (nomeProduto: string) => {
    if (!doacaoTarget) return;
    setDoacaoLoading(true);
    try {
      await registrarDoacao({
        membroId: doacaoTarget.membro_id,
        mes: periodo.mes,
        ano: periodo.ano,
        nomeProduto,
      });
      setDoacaoTarget(null);
    } finally {
      setDoacaoLoading(false);
    }
  };

  const handleConfirmReverter = async () => {
    if (!reverterTarget) return;
    setReverterLoading(true);
    try {
      await marcarPendente({
        membroId: reverterTarget.membro_id,
        mes: periodo.mes,
        ano: periodo.ano,
      });
      setReverterTarget(null);
    } finally {
      setReverterLoading(false);
    }
  };

  const handleDefinirCota = async (valorTxt: string) => {
    const valor = parseMoneyInput(valorTxt);
    if (!Number.isFinite(valor) || valor < 0) {
      setCotaFeedback("Valor inválido. Use formato 0,00.");
      return;
    }
    setCotaSalvando(true);
    setCotaFeedback(null);
    try {
      await definirCotaPadrao({
        mes: periodo.mes,
        ano: periodo.ano,
        valorCobrado: valor,
      });
      setCotaDialog(false);
    } catch (e) {
      setCotaFeedback(e instanceof Error ? e.message : "Falha ao salvar cota.");
    } finally {
      setCotaSalvando(false);
    }
  };

  const handlePeriodoConfirmado = (meses: Array<{ mes: number; ano: number }>) => {
    setPeriodoPickerVisible(false);
    const isSingle = meses.length === 1;
    Alert.alert("Compartilhar como?", undefined, [
      {
        text: "Compartilhar PDF",
        onPress: () => {
          const fn = isSingle
            ? exportarProdutos(meses[0].mes, meses[0].ano)
            : exportarProdutosMultiMes(meses);
          fn.catch((e) => {
            Alert.alert(
              "Falha ao gerar PDF",
              e instanceof Error ? e.message : "Não foi possível gerar o PDF."
            );
          });
        },
      },
      {
        text: "Enviar no WhatsApp",
        onPress: () => {
          compartilharResumoProdutosMultiMes(meses).catch((e) => {
            Alert.alert(
              "WhatsApp indisponível",
              e instanceof Error ? e.message : "Não foi possível abrir o WhatsApp."
            );
          });
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const renderItem = ({ item }: { item: ProdutoRow }) => {
    const isPago = item.status === "pago";
    const isParcial = item.status === "parcial";
    const isDoado = item.status === "doado";

    let subtitle: string;
    if (isPago) {
      subtitle = `Pago em ${formatDateBR(item.data_pagamento) || "—"}`;
    } else if (isParcial) {
      subtitle = `Parcial — pago ${formatMoney(item.valor_pago)} de ${formatMoney(item.valor_cobrado)}`;
    } else if (isDoado) {
      subtitle = item.nome_produto_doado
        ? `Doou: ${item.nome_produto_doado}`
        : "Produto doado";
    } else {
      subtitle = "Toque para registrar pagamento";
    }

    return (
      <ListItem
        title={item.membro_nome}
        subtitle={subtitle}
        onPress={() => handleItemPress(item)}
        accessibilityLabel={`${item.membro_nome}, status ${item.status}`}
        leading={
          <Avatar
            name={item.membro_nome}
            tone={isPago || isDoado ? "accent" : "primary"}
          />
        }
        trailing={
          <View style={styles.trailing}>
            <MoneyText
              value={item.valor_cobrado}
              tone={isPago || isDoado ? "positive" : isParcial ? "accent" : "muted"}
            />
            <StatusBadge status={statusParaBadge(item.status)} />
          </View>
        }
      />
    );
  };

  const adimplenciaTone = adimplenciaColor(totais.adimplenciaPercent);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerPicker}>
            <MonthYearPicker
              value={{ month: periodo.mes, year: periodo.ano }}
              onChange={(value) => setPeriodo({ mes: value.month, ano: value.year })}
            />
          </View>
          <Pressable
            onPress={() => setPeriodoPickerVisible(true)}
            disabled={exporting || rows.length === 0}
            hitSlop={touch.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Compartilhar"
            style={({ pressed }) => [
              styles.shareBtn,
              pressed && styles.shareBtnPressed,
              (exporting || rows.length === 0) && styles.shareBtnDisabled,
            ]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <Ionicons name="share-social" size={22} color={palette.primary} />
            )}
          </Pressable>
        </View>
      </View>

      <Card style={styles.summary}>
        <Text style={styles.summaryLabel}>{formatMonthYear(periodo.mes, periodo.ano)}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCell}>
            <Text style={styles.cellLabel}>Cobrado</Text>
            <MoneyText value={totais.totalCobrado} tone="accent" />
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.cellLabel}>Pago</Text>
            <MoneyText value={totais.totalPago} tone="positive" />
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.cellLabel}>Pendente</Text>
            <MoneyText value={totais.totalPendente} tone="negative" />
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.cellLabel}>Adimplência</Text>
            <Text style={[styles.adimplenciaValue, { color: adimplenciaTone }]}>
              {totais.adimplenciaPercent.toFixed(0)}%
            </Text>
            <Text style={styles.cellHint}>
              {totais.qtdPagos}/{totais.qtdTotal} pagas
            </Text>
          </View>
        </View>
      </Card>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && rows.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nenhum membro cadastrado"
          description="Cadastre os filhos-de-santo do terreiro para distribuir as cotas de produtos de limpeza."
          actionLabel="Definir cota do mês"
          onAction={() => {
            setCotaFeedback(null);
            setCotaDialog(true);
          }}
        />
      ) : (
        <>
          <View style={styles.searchWrap}>
            <SearchBar
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar membro..."
            />
          </View>
          {rowsFiltrados.length === 0 ? (
            <EmptyState
              title="Nenhum resultado"
              description={`Nenhum membro encontrado para "${busca}".`}
            />
          ) : (
            <FlatList
              data={rowsFiltrados}
              keyExtractor={(item) => `${item.membro_id}`}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.list}
              refreshing={loading}
              onRefresh={() => void reload()}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>
      )}

      <FAB
        label="Cota do mês"
        onPress={() => {
          setCotaFeedback(null);
          setCotaDialog(true);
        }}
        accessibilityLabel="Definir cota padrão do mês"
      />

      <PagamentoModal
        visible={pagamentoTarget !== null}
        membroNome={pagamentoTarget?.membro_nome ?? ""}
        mesLabel={formatMonthYear(periodo.mes, periodo.ano)}
        valorInicial={
          pagamentoTarget
            ? pagamentoTarget.valor_cobrado > 0
              ? Math.max(pagamentoTarget.valor_cobrado - pagamentoTarget.valor_pago, 0)
              : valorProduto
            : 0
        }
        loading={pagamentoLoading}
        onCancel={() => setPagamentoTarget(null)}
        onConfirm={handleConfirmPagamento}
      />

      <DoacaoModal
        visible={doacaoTarget !== null}
        membroNome={doacaoTarget?.membro_nome ?? ""}
        mesLabel={formatMonthYear(periodo.mes, periodo.ano)}
        loading={doacaoLoading}
        onCancel={() => setDoacaoTarget(null)}
        onConfirm={handleConfirmDoacao}
      />

      <ConfirmDialog
        visible={reverterTarget !== null}
        title={
          reverterTarget?.status === "doado"
            ? "Reverter doação?"
            : "Reverter pagamento?"
        }
        message={
          reverterTarget
            ? `Marcar ${reverterTarget.membro_nome} como pendente em ${formatMonthYear(periodo.mes, periodo.ano)}.`
            : undefined
        }
        confirmLabel="Marcar como pendente"
        cancelLabel={reverterTarget?.status === "doado" ? "Manter doado" : "Manter pago"}
        destructive
        loading={reverterLoading}
        onCancel={() => setReverterTarget(null)}
        onConfirm={handleConfirmReverter}
      />

      <NomeInputDialog
        visible={cotaDialog}
        title="Cota mensal por membro"
        placeholder="0,00"
        initialValue={
          valorProduto > 0 ? valorProduto.toFixed(2).replace(".", ",") : ""
        }
        confirmLabel="Aplicar a todos"
        loading={cotaSalvando}
        onConfirm={handleDefinirCota}
        onCancel={() => setCotaDialog(false)}
      />

      {cotaFeedback ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.errorText}>{cotaFeedback}</Text>
        </View>
      ) : null}

      <PeriodoPickerModal
        visible={periodoPickerVisible}
        periodoAtual={{ mes: periodo.mes, ano: periodo.ano }}
        onCancel={() => setPeriodoPickerVisible(false)}
        onConfirm={handlePeriodoConfirmado}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerPicker: {
    flex: 1,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    minHeight: 40,
  },
  shareBtnPressed: {
    backgroundColor: palette.surfaceAlt,
  },
  shareBtnDisabled: {
    opacity: 0.4,
  },
  shareBtnLabel: {
    ...typography.label,
    color: palette.primary,
  },
  summary: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  summaryLabel: {
    ...typography.label,
    color: palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  summaryCell: {
    flex: 1,
    minWidth: 80,
    gap: 2,
  },
  cellLabel: {
    ...typography.caption,
    color: palette.textMuted,
  },
  cellHint: {
    ...typography.caption,
    color: palette.textMuted,
  },
  adimplenciaValue: {
    ...typography.title,
  },
  trailing: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  separator: {
    height: spacing.sm,
  },
  searchWrap: {
    marginBottom: spacing.md,
  },
  list: {
    paddingBottom: 96,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.huge,
  },
  errorBox: {
    backgroundColor: palette.dangerBg,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  feedbackBox: {
    backgroundColor: palette.dangerBg,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: palette.danger,
  },
});
