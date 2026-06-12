import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  BigButton,
  Card,
  ConfirmDialog,
  FAB,
  MoneyText,
  PeriodoPickerModal,
  ScreenContainer,
} from "@/components";
import {
  CATEGORIAS_ENTRADA,
  CATEGORIAS_SAIDA,
  useCaixa,
} from "@/hooks/useCaixa";
import type { CaixaRow, AdicionarLancamentoInput } from "@/hooks/useCaixa";
import { palette, radius, shadows, spacing, touch, typography } from "@/themes";
import { formatDateBR, formatMoney, monthName, parseMoneyInput } from "@/utils/format";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function brToIso(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo}-${d}`;
}

function isoToBr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function lastDayOfMonth(mes: number, ano: number): string {
  const d = new Date(ano, mes, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ano}-${pad(mes)}-${pad(d.getDate())}`;
}

function periodLabel(dataInicio: string | null, dataFim: string | null): string {
  if (!dataInicio && !dataFim) return "Todo o período";
  if (dataInicio && dataFim) {
    return `${formatDateBR(dataInicio)} a ${formatDateBR(dataFim)}`;
  }
  return dataInicio ? `A partir de ${formatDateBR(dataInicio)}` : `Até ${formatDateBR(dataFim!)}`;
}

function categoriaIcon(categoria: string): string {
  switch (categoria) {
    case "Mensalidade": return "person";
    case "Produto de Limpeza": return "sparkles";
    case "Cantina": return "restaurant";
    case "Doação": return "heart";
    case "Patrocínio": return "ribbon";
    case "Água": return "water";
    case "Luz": return "flash";
    case "Aluguel": return "home";
    case "Material": return "hammer";
    case "Manutenção": return "construct";
    default: return "ellipse";
  }
}

export function CaixaScreen() {
  const [dataInicio, setDataInicio] = useState<string | null>(null);
  const [dataFim, setDataFim] = useState<string | null>(null);
  const [periodoPickerVisible, setPeriodoPickerVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CaixaRow | null>(null);
  const [deletando, setDeletando] = useState(false);
  const [lancamentoVisible, setLancamentoVisible] = useState(false);

  const { rows, totais, loading, error, reload, adicionarLancamento, deletarLancamento } =
    useCaixa(dataInicio, dataFim);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const handlePeriodoConfirmado = (meses: Array<{ mes: number; ano: number }>) => {
    setPeriodoPickerVisible(false);
    if (meses.length === 0) return;
    const sorted = [...meses].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const pad = (n: number) => String(n).padStart(2, "0");
    setDataInicio(`${first.ano}-${pad(first.mes)}-01`);
    setDataFim(lastDayOfMonth(last.mes, last.ano));
  };

  const handleClearPeriodo = () => {
    setDataInicio(null);
    setDataFim(null);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete?.lancamento_id) return;
    setDeletando(true);
    try {
      await deletarLancamento(pendingDelete.lancamento_id);
      setPendingDelete(null);
    } finally {
      setDeletando(false);
    }
  };

  const handleAdicionarLancamento = async (input: AdicionarLancamentoInput) => {
    try {
      await adicionarLancamento(input);
      setLancamentoVisible(false);
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Falha ao salvar.");
    }
  };

  const saldoPositivo = totais.saldo >= 0;

  const renderItem = ({ item }: { item: CaixaRow }) => {
    const isEntrada = item.tipo === "entrada";
    return (
      <View style={styles.row}>
        <View style={[styles.rowIcon, isEntrada ? styles.rowIconEntrada : styles.rowIconSaida]}>
          <Ionicons
            name={categoriaIcon(item.categoria) as never}
            size={18}
            color={isEntrada ? palette.success : palette.danger}
          />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowDesc} numberOfLines={1}>{item.descricao}</Text>
          <Text style={styles.rowMeta}>
            {item.categoria} · {formatDateBR(item.data)}
          </Text>
        </View>
        <View style={styles.rowTrailing}>
          <Text style={[styles.rowValor, isEntrada ? styles.valorPositivo : styles.valorNegativo]}>
            {isEntrada ? "+" : "−"} {formatMoney(item.valor)}
          </Text>
          {item.origem === "manual" ? (
            <Pressable
              onPress={() => setPendingDelete(item)}
              hitSlop={touch.hitSlop}
              accessibilityRole="button"
              accessibilityLabel="Excluir lançamento"
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
            >
              <Ionicons name="trash-outline" size={16} color={palette.danger} />
            </Pressable>
          ) : (
            <View style={styles.origemBadge}>
              <Text style={styles.origemBadgeText}>
                {item.origem === "mensalidade" ? "Mens." : "Prod."}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      {/* Period filter */}
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setPeriodoPickerVisible(true)}
          style={({ pressed }) => [styles.filterBtn, pressed && styles.filterBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Filtrar período"
        >
          <Ionicons name="calendar-outline" size={16} color={palette.primary} />
          <Text style={styles.filterText} numberOfLines={1}>
            {periodLabel(dataInicio, dataFim)}
          </Text>
        </Pressable>
        {(dataInicio || dataFim) ? (
          <Pressable
            onPress={handleClearPeriodo}
            hitSlop={touch.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Limpar filtro"
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={20} color={palette.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Summary card */}
      <Card style={styles.summary}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCell}>
            <Text style={styles.cellLabel}>Entradas</Text>
            <MoneyText value={totais.totalEntradas} tone="positive" />
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.cellLabel}>Saídas</Text>
            <MoneyText value={totais.totalSaidas} tone="negative" />
          </View>
          <View style={[styles.summaryCell, styles.summaryCellSaldo]}>
            <Text style={styles.cellLabel}>Saldo</Text>
            <Text style={[styles.saldoValue, saldoPositivo ? styles.saldoPos : styles.saldoNeg]}>
              {saldoPositivo ? "+" : "−"} {formatMoney(Math.abs(totais.saldo))}
            </Text>
          </View>
        </View>
        <Text style={styles.summaryCount}>
          {rows.length} {rows.length === 1 ? "lançamento" : "lançamentos"}
        </Text>
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
        <View style={styles.emptyBox}>
          <Ionicons name="wallet-outline" size={48} color={palette.textMuted} />
          <Text style={styles.emptyTitle}>Nenhum lançamento</Text>
          <Text style={styles.emptyDesc}>
            {dataInicio || dataFim
              ? "Não há lançamentos neste período."
              : "Toque em + para adicionar uma entrada ou saída."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={() => void reload()}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        label="Lançamento"
        onPress={() => setLancamentoVisible(true)}
        accessibilityLabel="Novo lançamento"
      />

      <PeriodoPickerModal
        visible={periodoPickerVisible}
        periodoAtual={(() => {
          const now = new Date();
          return { mes: now.getMonth() + 1, ano: now.getFullYear() };
        })()}
        onCancel={() => setPeriodoPickerVisible(false)}
        onConfirm={handlePeriodoConfirmado}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Excluir lançamento?"
        message={
          pendingDelete
            ? `"${pendingDelete.descricao}" — ${formatMoney(pendingDelete.valor)}`
            : undefined
        }
        confirmLabel="Excluir"
        destructive
        loading={deletando}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />

      <LancamentoModal
        visible={lancamentoVisible}
        onCancel={() => setLancamentoVisible(false)}
        onConfirm={handleAdicionarLancamento}
      />
    </ScreenContainer>
  );
}

// ─── Lançamento modal ────────────────────────────────────────────────────────

type LancamentoModalProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (input: AdicionarLancamentoInput) => Promise<void>;
};

function LancamentoModal({ visible, onCancel, onConfirm }: LancamentoModalProps) {
  const { bottom } = useSafeAreaInsets();
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_ENTRADA[0]);
  const [descricao, setDescricao] = useState("");
  const [valorText, setValorText] = useState("");
  const [dataText, setDataText] = useState(isoToBr(isoToday()));
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<string | null>(null);

  const categorias = tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;

  const handleTipoChange = (t: "entrada" | "saida") => {
    setTipo(t);
    setCategoria(t === "entrada" ? CATEGORIAS_ENTRADA[0] : CATEGORIAS_SAIDA[0]);
  };

  const handleConfirm = async () => {
    setErros(null);
    const valor = parseMoneyInput(valorText);
    if (!Number.isFinite(valor) || valor <= 0) {
      setErros("Informe um valor válido maior que zero.");
      return;
    }
    const data = brToIso(dataText);
    if (!data) {
      setErros("Data inválida. Use o formato DD/MM/AAAA.");
      return;
    }
    if (!descricao.trim()) {
      setErros("Informe uma descrição.");
      return;
    }
    setSalvando(true);
    try {
      await onConfirm({ tipo, categoria, descricao, valor, data });
      setDescricao("");
      setValorText("");
      setDataText(isoToBr(isoToday()));
      setTipo("entrada");
      setCategoria(CATEGORIAS_ENTRADA[0]);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={mStyles.backdrop}>
        <Pressable style={mStyles.backdropTouch} onPress={onCancel} />
        <View style={[mStyles.sheet, { paddingBottom: spacing.xl + bottom }]}>
          <Text style={mStyles.title}>Novo lançamento</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Tipo */}
            <Text style={mStyles.label}>Tipo</Text>
            <View style={mStyles.tipoRow}>
              <Pressable
                onPress={() => handleTipoChange("entrada")}
                style={[mStyles.tipoBtn, tipo === "entrada" && mStyles.tipoBtnEntrada]}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={18}
                  color={tipo === "entrada" ? palette.white : palette.success}
                />
                <Text style={[mStyles.tipoBtnText, tipo === "entrada" && mStyles.tipoBtnTextActive]}>
                  Entrada
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleTipoChange("saida")}
                style={[mStyles.tipoBtn, tipo === "saida" && mStyles.tipoBtnSaida]}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={18}
                  color={tipo === "saida" ? palette.white : palette.danger}
                />
                <Text style={[mStyles.tipoBtnText, tipo === "saida" && mStyles.tipoBtnTextActive]}>
                  Saída
                </Text>
              </Pressable>
            </View>

            {/* Categoria */}
            <Text style={mStyles.label}>Categoria</Text>
            <View style={mStyles.categorias}>
              {categorias.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategoria(cat)}
                  style={[mStyles.catChip, categoria === cat && mStyles.catChipSelected]}
                >
                  <Text style={[mStyles.catChipText, categoria === cat && mStyles.catChipTextSelected]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Descrição */}
            <Text style={mStyles.label}>Descrição</Text>
            <TextInput
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex: Cantina do domingo, Conta de água..."
              placeholderTextColor={palette.textMuted}
              style={mStyles.input}
              editable={!salvando}
            />

            {/* Valor */}
            <Text style={mStyles.label}>Valor (R$)</Text>
            <TextInput
              value={valorText}
              onChangeText={setValorText}
              placeholder="0,00"
              placeholderTextColor={palette.textMuted}
              keyboardType="decimal-pad"
              style={mStyles.input}
              editable={!salvando}
            />

            {/* Data */}
            <Text style={mStyles.label}>Data</Text>
            <TextInput
              value={dataText}
              onChangeText={setDataText}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={palette.textMuted}
              keyboardType="numbers-and-punctuation"
              style={mStyles.input}
              editable={!salvando}
            />

            {erros ? <Text style={mStyles.erro}>{erros}</Text> : null}
          </ScrollView>

          <View style={mStyles.actions}>
            <BigButton label="Cancelar" onPress={onCancel} variant="secondary" disabled={salvando} />
            <BigButton
              label="Salvar"
              onPress={() => void handleConfirm()}
              variant={tipo === "entrada" ? "primary" : "danger"}
              loading={salvando}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: touch.minHeight,
  },
  filterBtnPressed: { backgroundColor: palette.surfaceAlt },
  filterText: {
    ...typography.body,
    color: palette.primary,
    flex: 1,
  },
  clearBtn: {
    padding: spacing.xs,
  },
  summary: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryCell: {
    flex: 1,
    gap: 2,
  },
  summaryCellSaldo: {
    alignItems: "flex-end",
  },
  cellLabel: {
    ...typography.caption,
    color: palette.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  saldoValue: {
    ...typography.title,
    fontSize: 15,
  },
  saldoPos: { color: palette.success },
  saldoNeg: { color: palette.danger },
  summaryCount: {
    ...typography.caption,
    color: palette.textMuted,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: touch.minHeight,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconEntrada: { backgroundColor: palette.successBg },
  rowIconSaida: { backgroundColor: palette.dangerBg },
  rowBody: { flex: 1, gap: 2 },
  rowDesc: {
    ...typography.bodyStrong,
    color: palette.textPrimary,
  },
  rowMeta: {
    ...typography.caption,
    color: palette.textMuted,
  },
  rowTrailing: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  rowValor: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  valorPositivo: { color: palette.success },
  valorNegativo: { color: palette.danger },
  deleteBtn: {
    padding: 4,
    borderRadius: radius.sm,
  },
  deleteBtnPressed: { backgroundColor: palette.dangerBg },
  origemBadge: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  origemBadgeText: {
    ...typography.caption,
    color: palette.textMuted,
    fontSize: 10,
  },
  separator: { height: spacing.sm },
  list: { paddingBottom: 96 },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.huge,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.huge,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: palette.textSecondary,
  },
  emptyDesc: {
    ...typography.body,
    color: palette.textMuted,
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: palette.dangerBg,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: palette.danger,
  },
});

const mStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: palette.overlay,
    justifyContent: "flex-end",
  },
  backdropTouch: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    maxHeight: "90%",
    ...shadows.lg,
  },
  title: {
    ...typography.title,
    color: palette.textPrimary,
  },
  label: {
    ...typography.label,
    color: palette.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  tipoRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  tipoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  tipoBtnEntrada: {
    backgroundColor: palette.success,
    borderColor: palette.success,
  },
  tipoBtnSaida: {
    backgroundColor: palette.danger,
    borderColor: palette.danger,
  },
  tipoBtnText: {
    ...typography.bodyStrong,
    color: palette.textPrimary,
  },
  tipoBtnTextActive: {
    color: palette.white,
  },
  categorias: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  catChipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  catChipText: {
    ...typography.caption,
    color: palette.textSecondary,
    fontWeight: "600",
  },
  catChipTextSelected: {
    color: palette.white,
  },
  input: {
    ...typography.body,
    color: palette.textPrimary,
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: touch.minHeight,
    marginBottom: spacing.xs,
  },
  erro: {
    ...typography.caption,
    color: palette.danger,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
