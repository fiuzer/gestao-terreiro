import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BigButton,
  Card,
  EmptyState,
  MonthYearPicker,
  NomeInputDialog,
  TextField,
} from "@/components";
import { palette, radius, spacing, touch, typography } from "@/themes";
import { formatMoney, parseMoneyInput } from "@/utils/format";
import { useMembros } from "@/hooks/useMembros";
import { useCriarPlanilhaComMembros } from "@/hooks/usePlanilha";
import { useTemplates } from "@/hooks/useTemplates";
import type { PlanilhaRoutes } from "@/navigation/types";

type Nav = NativeStackNavigationProp<PlanilhaRoutes, "PlanilhaForm">;
type RouteParams = RouteProp<PlanilhaRoutes, "PlanilhaForm">;

type MembroLinha = {
  key: string;
  nome: string;
  selecionado: boolean;
  origemMembroId: number;
};

function todayMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function PlanilhaFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const { tipoModulo, orixaId, categoriaId, templateId, templateNome } =
    route.params;
  const isTemplate = typeof templateId === "number";

  const { membrosAtivos, loading: membrosLoading, error: membrosError } =
    useMembros();
  const criarComMembros = useCriarPlanilhaComMembros();
  const { criarPlanilhaPorTemplate } = useTemplates();

  const [nome, setNome] = useState<string>(templateNome ?? "");
  const [periodo, setPeriodo] = useState(todayMonthYear);
  const [usarValorPadrao, setUsarValorPadrao] = useState<boolean>(false);
  const [valorPadraoTxt, setValorPadraoTxt] = useState<string>("");
  const [extras, setExtras] = useState<string[]>([]);
  const [desmarcados, setDesmarcados] = useState<Set<number>>(() => new Set());
  const [dialogExtra, setDialogExtra] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: isTemplate ? "Nova planilha (modelo)" : "Nova planilha",
    });
  }, [navigation, isTemplate]);

  const membrosLinhas = useMemo<MembroLinha[]>(() => {
    return membrosAtivos.map((m) => ({
      key: `membro-${m.id}`,
      nome: m.nome,
      selecionado: !desmarcados.has(m.id),
      origemMembroId: m.id,
    }));
  }, [membrosAtivos, desmarcados]);

  const valorPadraoParsed = parseMoneyInput(valorPadraoTxt);
  const valorPadraoValido =
    !usarValorPadrao ||
    (Number.isFinite(valorPadraoParsed) && valorPadraoParsed >= 0);

  const totalSelecionados = useMemo(() => {
    if (isTemplate) return 0;
    const ativos = membrosLinhas.filter((m) => m.selecionado).length;
    return ativos + extras.length;
  }, [isTemplate, membrosLinhas, extras.length]);

  const toggleMembro = useCallback((membroId: number) => {
    setDesmarcados((prev) => {
      const next = new Set(prev);
      if (next.has(membroId)) next.delete(membroId);
      else next.add(membroId);
      return next;
    });
  }, []);

  const adicionarExtra = useCallback((valor: string) => {
    const trimmed = valor.trim();
    if (!trimmed) {
      setDialogExtra(false);
      return;
    }
    setExtras((prev) => [...prev, trimmed]);
    setDialogExtra(false);
  }, []);

  const removerExtra = useCallback((index: number) => {
    setExtras((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCriar = async () => {
    if (!nome.trim()) {
      setErro("Informe o nome da planilha.");
      return;
    }
    if (usarValorPadrao && !valorPadraoValido) {
      setErro("Valor padrão inválido. Use formato 0,00.");
      return;
    }
    if (!isTemplate && totalSelecionados === 0) {
      setErro("Selecione ao menos um membro ou adicione um nome extra.");
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      const valorPadrao = usarValorPadrao ? valorPadraoParsed : 0;
      let novoId: number;

      if (isTemplate) {
        novoId = await criarPlanilhaPorTemplate({
          templateId,
          nome: nome.trim(),
          tipo_modulo: tipoModulo,
          orixa_id: orixaId,
          categoria_id: categoriaId,
          mes: periodo.month,
          ano: periodo.year,
          valorPadrao,
        });
      } else {
        const nomesSelecionados = membrosLinhas
          .filter((m) => m.selecionado)
          .map((m) => ({ nome: m.nome }));
        const nomesExtras = extras.map((n) => ({ nome: n }));
        const resultado = await criarComMembros({
          nome: nome.trim(),
          mes: periodo.month,
          ano: periodo.year,
          tipoModulo,
          orixaId,
          categoriaId,
          valorPadrao,
          nomes: [...nomesSelecionados, ...nomesExtras],
        });
        novoId = resultado.planilhaId;
      }

      navigation.replace("PlanilhaDetail", { planilhaId: novoId });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao criar planilha.");
    } finally {
      setSalvando(false);
    }
  };

  const podeCriar =
    !salvando &&
    nome.trim().length > 0 &&
    (isTemplate || totalSelecionados > 0) &&
    valorPadraoValido;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TextField
            label="Nome da planilha"
            value={nome}
            onChangeText={setNome}
            placeholder="Ex.: Festa de Iemanjá"
            maxLength={120}
            returnKeyType="next"
            autoFocus
          />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mês de referência</Text>
            <MonthYearPicker value={periodo} onChange={setPeriodo} />
          </View>

          <Card style={styles.valorCard}>
            <View style={styles.valorHeader}>
              <View style={styles.valorTextWrap}>
                <Text style={styles.valorTitle}>
                  Definir valor padrão para todos?
                </Text>
                <Text style={styles.valorSub}>
                  {usarValorPadrao
                    ? "Cada pessoa começará com este valor cobrado."
                    : "Cada pessoa começará com R$ 0,00 — você define depois."}
                </Text>
              </View>
              <Switch
                value={usarValorPadrao}
                onValueChange={setUsarValorPadrao}
                trackColor={{ false: palette.border, true: palette.primaryLight }}
                thumbColor={usarValorPadrao ? palette.primary : palette.surface}
                accessibilityLabel="Usar valor padrão"
              />
            </View>
            {usarValorPadrao ? (
              <TextField
                label="Valor padrão (R$)"
                value={valorPadraoTxt}
                onChangeText={setValorPadraoTxt}
                keyboardType="decimal-pad"
                placeholder="0,00"
                helperText={
                  Number.isFinite(valorPadraoParsed) && valorPadraoParsed > 0
                    ? `Equivale a ${formatMoney(valorPadraoParsed)}`
                    : "Digite o valor que cada pessoa deve pagar"
                }
                errorText={!valorPadraoValido ? "Valor inválido." : undefined}
              />
            ) : null}
          </Card>

          {isTemplate ? (
            <Card style={styles.templateCard}>
              <View style={styles.templateRow}>
                <Ionicons name="bookmark" size={20} color={palette.primary} />
                <Text style={styles.templateText} numberOfLines={2}>
                  Linhas pré-preenchidas pelo modelo
                  {templateNome ? ` “${templateNome}”` : ""}.
                </Text>
              </View>
            </Card>
          ) : (
            <View style={styles.field}>
              <View style={styles.membrosHeader}>
                <Text style={styles.fieldLabel}>
                  Pessoas ({totalSelecionados})
                </Text>
                <Pressable
                  onPress={() => setDialogExtra(true)}
                  hitSlop={touch.hitSlop}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar nome extra"
                  style={({ pressed }) => [
                    styles.addExtraBtn,
                    pressed && styles.addExtraBtnPressed,
                  ]}
                >
                  <Ionicons name="add" size={18} color={palette.primary} />
                  <Text style={styles.addExtraLabel}>Adicionar nome extra</Text>
                </Pressable>
              </View>

              {membrosLoading && membrosAtivos.length === 0 ? (
                <View style={styles.membrosLoading}>
                  <ActivityIndicator color={palette.primary} />
                </View>
              ) : membrosError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{membrosError}</Text>
                </View>
              ) : membrosLinhas.length === 0 && extras.length === 0 ? (
                <EmptyState
                  title="Nenhum membro ativo"
                  description="Cadastre membros em Mensalidades › Membros ou adicione nomes extras para esta planilha."
                />
              ) : (
                <View style={styles.membrosList}>
                  {membrosLinhas.map((m) => (
                    <MembroRow
                      key={m.key}
                      nome={m.nome}
                      selecionado={m.selecionado}
                      onToggle={() => toggleMembro(m.origemMembroId)}
                    />
                  ))}
                  {extras.map((nomeExtra, idx) => (
                    <ExtraRow
                      key={`extra-${idx}-${nomeExtra}`}
                      nome={nomeExtra}
                      onRemove={() => removerExtra(idx)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {erro ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{erro}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <BigButton
              label="Criar planilha"
              variant="primary"
              loading={salvando}
              disabled={!podeCriar}
              onPress={() => {
                void handleCriar();
              }}
            />
            <BigButton
              label="Cancelar"
              variant="ghost"
              disabled={salvando}
              onPress={() => navigation.goBack()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <NomeInputDialog
        visible={dialogExtra}
        title="Adicionar nome extra"
        placeholder="Ex.: Convidado(a)"
        confirmLabel="Adicionar"
        onConfirm={adicionarExtra}
        onCancel={() => setDialogExtra(false)}
      />
    </SafeAreaView>
  );
}

function MembroRow({
  nome,
  selecionado,
  onToggle,
}: {
  nome: string;
  selecionado: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={touch.hitSlop}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selecionado }}
      accessibilityLabel={`${nome}, ${selecionado ? "selecionado" : "desmarcado"}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.checkbox, selecionado && styles.checkboxOn]}>
        {selecionado ? (
          <Ionicons name="checkmark" size={18} color={palette.white} />
        ) : null}
      </View>
      <Text
        style={[styles.rowName, !selecionado && styles.rowNameMuted]}
        numberOfLines={1}
      >
        {nome}
      </Text>
    </Pressable>
  );
}

function ExtraRow({
  nome,
  onRemove,
}: {
  nome: string;
  onRemove: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.extraIcon}>
        <Ionicons
          name="person-add-outline"
          size={18}
          color={palette.primary}
        />
      </View>
      <Text style={styles.rowName} numberOfLines={1}>
        {nome}
      </Text>
      <Pressable
        onPress={onRemove}
        hitSlop={touch.hitSlop}
        accessibilityRole="button"
        accessibilityLabel={`Remover ${nome}`}
        style={({ pressed }) => [
          styles.removeBtn,
          pressed && styles.removeBtnPressed,
        ]}
      >
        <Ionicons name="close" size={20} color={palette.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.huge,
  },
  field: { gap: spacing.sm },
  fieldLabel: {
    ...typography.label,
    color: palette.textSecondary,
  },
  valorCard: { gap: spacing.md },
  valorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  valorTextWrap: { flex: 1, gap: 2 },
  valorTitle: {
    ...typography.bodyStrong,
    color: palette.textPrimary,
  },
  valorSub: {
    ...typography.caption,
    color: palette.textMuted,
  },
  templateCard: { backgroundColor: palette.surfaceAlt },
  templateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  templateText: {
    flex: 1,
    ...typography.body,
    color: palette.textSecondary,
  },
  membrosHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  addExtraBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },
  addExtraBtnPressed: { backgroundColor: palette.surfaceAlt },
  addExtraLabel: {
    ...typography.label,
    color: palette.primary,
  },
  membrosLoading: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  membrosList: { gap: spacing.sm },
  row: {
    minHeight: touch.minHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  rowPressed: { backgroundColor: palette.surfaceAlt },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: palette.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surface,
  },
  checkboxOn: {
    borderColor: palette.primary,
    backgroundColor: palette.primary,
  },
  rowName: {
    flex: 1,
    ...typography.body,
    color: palette.textPrimary,
  },
  rowNameMuted: {
    color: palette.textMuted,
    textDecorationLine: "line-through",
  },
  extraIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    width: touch.iconButton,
    height: touch.iconButton,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  removeBtnPressed: { backgroundColor: palette.dangerBg },
  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  errorBox: {
    padding: spacing.md,
    backgroundColor: palette.dangerBg,
    borderRadius: radius.md,
  },
  errorText: {
    ...typography.body,
    color: palette.danger,
  },
});
