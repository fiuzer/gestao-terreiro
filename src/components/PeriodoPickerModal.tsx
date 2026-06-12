import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BigButton } from "./BigButton";
import { MonthYearPicker } from "./MonthYearPicker";
import { palette, radius, shadows, spacing, typography } from "@/themes";
import { formatMonthYear, monthName } from "@/utils/format";

type Periodo = { mes: number; ano: number };
type PresetId = "atual" | "trimestre" | "semestre" | "ano" | "personalizado";

export type PeriodoPickerModalProps = {
  visible: boolean;
  periodoAtual: Periodo;
  onCancel: () => void;
  onConfirm: (meses: Periodo[]) => void;
};

function subMonths(mes: number, ano: number, n: number): Periodo {
  let m = mes - n;
  let a = ano;
  while (m <= 0) { m += 12; a--; }
  return { mes: m, ano: a };
}

function mesRange(de: Periodo, ate: Periodo): Periodo[] {
  const result: Periodo[] = [];
  let m = de.mes, a = de.ano;
  let safety = 0;
  while ((a < ate.ano || (a === ate.ano && m <= ate.mes)) && safety < 120) {
    result.push({ mes: m, ano: a });
    m++; if (m > 12) { m = 1; a++; }
    safety++;
  }
  return result;
}

function presetMeses(id: PresetId, atual: Periodo, de: Periodo, ate: Periodo): Periodo[] {
  const { mes, ano } = atual;
  switch (id) {
    case "atual": return [{ mes, ano }];
    case "trimestre": return mesRange(subMonths(mes, ano, 2), atual);
    case "semestre": return mesRange(subMonths(mes, ano, 5), atual);
    case "ano": return mesRange({ mes: 1, ano }, atual);
    case "personalizado": return mesRange(de, ate);
  }
}

function presetRangeLabel(id: PresetId, atual: Periodo): string {
  const { mes, ano } = atual;
  switch (id) {
    case "atual": return formatMonthYear(mes, ano);
    case "trimestre": {
      const ini = subMonths(mes, ano, 2);
      if (ini.ano === ano) return `${monthName(ini.mes)} a ${monthName(mes)} de ${ano}`;
      return `${monthName(ini.mes)}/${ini.ano} a ${monthName(mes)}/${ano}`;
    }
    case "semestre": {
      const ini = subMonths(mes, ano, 5);
      if (ini.ano === ano) return `${monthName(ini.mes)} a ${monthName(mes)} de ${ano}`;
      return `${monthName(ini.mes)}/${ini.ano} a ${monthName(mes)}/${ano}`;
    }
    case "ano": return `Janeiro a ${monthName(mes)} de ${ano}`;
    case "personalizado": return "Escolha o intervalo abaixo";
  }
}

const PRESETS: Array<{ id: PresetId; label: string }> = [
  { id: "atual", label: "Mês atual" },
  { id: "trimestre", label: "Último trimestre (3 meses)" },
  { id: "semestre", label: "Último semestre (6 meses)" },
  { id: "ano", label: "Ano atual completo" },
  { id: "personalizado", label: "Personalizado" },
];

export function PeriodoPickerModal({
  visible,
  periodoAtual,
  onCancel,
  onConfirm,
}: PeriodoPickerModalProps) {
  const { bottom } = useSafeAreaInsets();
  const [selected, setSelected] = useState<PresetId>("atual");
  const [de, setDe] = useState<Periodo>(periodoAtual);
  const [ate, setAte] = useState<Periodo>(periodoAtual);

  const handleConfirm = () => {
    const meses = presetMeses(selected, periodoAtual, de, ate);
    if (meses.length === 0) return;
    onConfirm(meses);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onCancel} accessibilityLabel="Fechar" />
        <View style={[styles.sheet, { paddingBottom: spacing.xl + bottom }]}>
          <Text style={styles.title}>Período do relatório</Text>

          <ScrollView style={styles.options} showsVerticalScrollIndicator={false}>
            {PRESETS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setSelected(p.id)}
                style={[styles.option, selected === p.id && styles.optionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected === p.id }}
              >
                <View style={[styles.radio, selected === p.id && styles.radioSelected]}>
                  {selected === p.id && <View style={styles.radioDot} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, selected === p.id && styles.optionLabelSelected]}>
                    {p.label}
                  </Text>
                  <Text style={styles.optionHint}>
                    {presetRangeLabel(p.id, periodoAtual)}
                  </Text>
                </View>
              </Pressable>
            ))}

            {selected === "personalizado" && (
              <View style={styles.rangeWrap}>
                <View style={styles.rangeRow}>
                  <Text style={styles.rangeLabel}>De</Text>
                  <MonthYearPicker
                    value={{ month: de.mes, year: de.ano }}
                    onChange={(v) => {
                      const novo = { mes: v.month, ano: v.year };
                      setDe(novo);
                      if (v.year > ate.ano || (v.year === ate.ano && v.month > ate.mes)) {
                        setAte(novo);
                      }
                    }}
                    style={styles.rangePicker}
                  />
                </View>
                <View style={styles.rangeRow}>
                  <Text style={styles.rangeLabel}>Até</Text>
                  <MonthYearPicker
                    value={{ month: ate.mes, year: ate.ano }}
                    onChange={(v) => setAte({ mes: v.month, ano: v.year })}
                    style={styles.rangePicker}
                  />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <BigButton label="Cancelar" onPress={onCancel} variant="secondary" />
            <BigButton label="Confirmar" onPress={handleConfirm} variant="primary" />
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
    justifyContent: "flex-end",
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.lg,
  },
  title: {
    ...typography.title,
    color: palette.textPrimary,
  },
  options: {
    maxHeight: 400,
  },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  optionSelected: {
    backgroundColor: palette.surfaceAlt,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioSelected: {
    borderColor: palette.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.primary,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    ...typography.body,
    color: palette.textPrimary,
  },
  optionLabelSelected: {
    color: palette.primary,
    fontWeight: "600",
  },
  optionHint: {
    ...typography.caption,
    color: palette.textMuted,
  },
  rangeWrap: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingLeft: spacing.xl + spacing.sm,
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rangeLabel: {
    ...typography.label,
    color: palette.textSecondary,
    width: 28,
  },
  rangePicker: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
});
