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
  EmptyState,
  FAB,
  ListItem,
  MoneyText,
  MonthYearPicker,
  PagamentoModal,
  PeriodoPickerModal,
  ScreenContainer,
  SearchBar,
  StatusBadge,
} from "@/components";
import { useConfiguracoes, useMensalidades } from "@/hooks";
import type { MensalidadeRow } from "@/hooks";
import { useExport } from "@/hooks/useExport";
import type { MensalidadesStackParamList } from "@/navigation/AppNavigator";
import { palette, radius, spacing, touch, typography } from "@/themes";
import { formatDateBR, formatMoney, formatMonthYear } from "@/utils/format";

type Props = NativeStackScreenProps<MensalidadesStackParamList, "MensalidadesHome">;

function todayMonthYear(): { mes: number; ano: number } {
  const now = new Date();
  return { mes: now.getMonth() + 1, ano: now.getFullYear() };
}

function adimplenciaColor(percent: number): string {
  if (percent >= 80) return palette.success;
  if (percent >= 50) return palette.warning;
  return palette.danger;
}

export function MensalidadesScreen({ navigation }: Props) {
  const initial = todayMonthYear();
  const [periodo, setPeriodo] = useState(initial);
  const { valorMensalidade } = useConfiguracoes();
  const {
    rows,
    totais,
    loading,
    error,
    reload,
    registrarPagamento,
    marcarPendente,
  } = useMensalidades(periodo.mes, periodo.ano, valorMensalidade);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const [pagamentoTarget, setPagamentoTarget] = useState<MensalidadeRow | null>(null);
  const [pagamentoLoading, setPagamentoLoading] = useState(false);
  const [reverterTarget, setReverterTarget] = useState<MensalidadeRow | null>(null);
  const [reverterLoading, setReverterLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [periodoPickerVisible, setPeriodoPickerVisible] = useState(false);
  const {
    exportarMensalidades,
    exportarMensalidadesMultiMes,
    compartilharResumoMensalidadesMultiMes,
    exporting: exportando,
  } = useExport();

  const rowsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return rows;
    return rows.filter((r) => r.membro_nome.toLowerCase().includes(termo));
  }, [rows, busca]);

  const handleItemPress = (row: MensalidadeRow) => {
    if (row.status === "pago") {
      setReverterTarget(row);
    } else {
      setPagamentoTarget(row);
    }
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

  const handlePeriodoConfirmado = (meses: Array<{ mes: number; ano: number }>) => {
    setPeriodoPickerVisible(false);
    const isSingle = meses.length === 1;
    Alert.alert("Compartilhar como?", undefined, [
      {
        text: "Compartilhar PDF",
        onPress: () => {
          const fn = isSingle
            ? exportarMensalidades(meses[0].mes, meses[0].ano)
            : exportarMensalidadesMultiMes(meses);
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
          compartilharResumoMensalidadesMultiMes(meses).catch((e) => {
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

  const renderItem = ({ item }: { item: MensalidadeRow }) => {
    const isPago = item.status === "pago";
    const displayValor = item.valor > 0 ? item.valor : valorMensalidade;
    const subtitle = isPago
      ? `Pago em ${formatDateBR(item.data_pagamento) || "—"}`
      : `Pendente — ${formatMoney(displayValor)}`;

    return (
      <ListItem
        title={item.membro_nome}
        subtitle={subtitle}
        onPress={() => handleItemPress(item)}
        accessibilityLabel={`${item.membro_nome}, status ${isPago ? "pago" : "pendente"}`}
        leading={
          <Avatar name={item.membro_nome} tone={isPago ? "accent" : "primary"} />
        }
        trailing={
          <View style={styles.trailing}>
            <MoneyText value={displayValor} tone={isPago ? "positive" : "muted"} />
            <StatusBadge status={isPago ? "paid" : "pending"} />
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
              onChange={(value) =>
                setPeriodo({ mes: value.month, ano: value.year })
              }
            />
          </View>
          <Pressable
            onPress={() => setPeriodoPickerVisible(true)}
            disabled={exportando || rows.length === 0}
            hitSlop={touch.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Compartilhar"
            style={({ pressed }) => [
              styles.shareBtn,
              pressed && styles.shareBtnPressed,
              (exportando || rows.length === 0) && styles.shareBtnDisabled,
            ]}
          >
            {exportando ? (
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
            <Text style={styles.cellLabel}>Arrecadado</Text>
            <MoneyText value={totais.totalArrecadado} tone="positive" />
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
          description="Cadastre os filhos-de-santo do terreiro para começar a controlar as mensalidades."
          actionLabel="Gerenciar membros"
          onAction={() => navigation.navigate("Membros")}
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
        label="Membros"
        icon="☻"
        onPress={() => navigation.navigate("Membros")}
        accessibilityLabel="Gerenciar membros"
      />

      <PagamentoModal
        visible={pagamentoTarget !== null}
        membroNome={pagamentoTarget?.membro_nome ?? ""}
        mesLabel={formatMonthYear(periodo.mes, periodo.ano)}
        valorInicial={
          pagamentoTarget
            ? pagamentoTarget.valor > 0
              ? pagamentoTarget.valor
              : valorMensalidade
            : 0
        }
        loading={pagamentoLoading}
        onCancel={() => setPagamentoTarget(null)}
        onConfirm={handleConfirmPagamento}
      />

      <ConfirmDialog
        visible={reverterTarget !== null}
        title="Reverter pagamento?"
        message={
          reverterTarget
            ? `Marcar ${reverterTarget.membro_nome} como pendente em ${formatMonthYear(periodo.mes, periodo.ano)}.`
            : undefined
        }
        confirmLabel="Marcar como pendente"
        cancelLabel="Manter pago"
        destructive
        loading={reverterLoading}
        onCancel={() => setReverterTarget(null)}
        onConfirm={handleConfirmReverter}
      />

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
    gap: spacing.md,
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
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },
  shareBtnPressed: {
    backgroundColor: palette.surfaceAlt,
  },
  shareBtnDisabled: {
    opacity: 0.5,
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
  },
  summaryCell: {
    flex: 1,
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
  errorText: {
    ...typography.body,
    color: palette.danger,
  },
});
