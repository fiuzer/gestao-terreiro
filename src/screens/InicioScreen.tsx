import { useCallback } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { BigButton, Card, MoneyText, ScreenContainer } from "@/components";
import { useDashboard } from "@/hooks";
import type { RootTabParamList } from "@/navigation/AppNavigator";
import { palette, radius, spacing, typography } from "@/themes";
import { formatMonthYear } from "@/utils/format";

type TabNav = BottomTabNavigationProp<RootTabParamList>;

function todayMonthYear(): { mes: number; ano: number } {
  const now = new Date();
  return { mes: now.getMonth() + 1, ano: now.getFullYear() };
}

function adimplenciaTone(percent: number): string {
  if (percent >= 80) return palette.success;
  if (percent >= 50) return palette.warning;
  return palette.danger;
}

export function InicioScreen() {
  const navigation = useNavigation<TabNav>();
  const periodo = todayMonthYear();
  const { resumo, loading, error, reload } = useDashboard(periodo.mes, periodo.ano);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const { mensalidades, produtos, pendenciasTotal } = resumo;
  const adimpColor = adimplenciaTone(mensalidades.adimplenciaPercent);

  return (
    <ScreenContainer scroll={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greeting}>
          <Text style={styles.greetingHi}>Axé, Ekedy Meire!</Text>
          <Text style={styles.greetingSub}>
            Resumo de {formatMonthYear(periodo.mes, periodo.ano)}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading && mensalidades.qtdTotal === 0 && produtos.qtdTotal === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : null}

        <Card
          tone="highlight"
          style={styles.card}
          testID="card-mensalidades"
        >
          <View
            style={styles.cardTouch}
            onTouchEnd={() => navigation.navigate("Mensalidades")}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Abrir mensalidades"
          >
            <Text style={styles.cardLabel}>Mensalidades</Text>
            <View style={styles.adimpRow}>
              <Text style={[styles.adimpValue, { color: adimpColor }]}>
                {mensalidades.adimplenciaPercent.toFixed(0)}%
              </Text>
              <Text style={styles.adimpHint}>de adimplência</Text>
            </View>
            <Text style={styles.cardMeta}>
              {mensalidades.qtdPagos} de {mensalidades.qtdTotal} pagas ·{" "}
              <Text style={styles.cardMetaStrong}>
                Arrecadado{" "}
              </Text>
            </Text>
            <View style={styles.cardMoneyRow}>
              <MoneyText value={mensalidades.totalArrecadado} tone="positive" />
            </View>
          </View>
        </Card>

        <Card style={styles.card} testID="card-produtos">
          <View
            style={styles.cardTouch}
            onTouchEnd={() => navigation.navigate("Produtos")}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Abrir produtos de limpeza"
          >
            <Text style={styles.cardLabel}>Produtos de limpeza</Text>
            {produtos.qtdTotal === 0 ? (
              <Text style={styles.cardMeta}>
                Nenhuma cota definida este mês
              </Text>
            ) : (
              <>
                <View style={styles.adimpRow}>
                  <Text
                    style={[
                      styles.adimpValue,
                      { color: adimplenciaTone(produtos.adimplenciaPercent) },
                    ]}
                  >
                    {produtos.adimplenciaPercent.toFixed(0)}%
                  </Text>
                  <Text style={styles.adimpHint}>contribuíram</Text>
                </View>
                <Text style={styles.cardMeta}>
                  {produtos.qtdPagos} de {produtos.qtdTotal} membros ·{" "}
                  <Text style={styles.cardMetaStrong}>
                    Arrecadado{" "}
                  </Text>
                </Text>
                <View style={styles.cardMoneyRow}>
                  <MoneyText value={produtos.totalArrecadado} tone="positive" />
                </View>
              </>
            )}
          </View>
        </Card>

        <Card
          style={[
            styles.card,
            pendenciasTotal > 0 ? styles.cardAlert : styles.cardOk,
          ]}
          testID="card-pendencias"
        >
          <Text style={styles.cardLabel}>Pendências</Text>
          <Text
            style={[
              styles.pendValue,
              { color: pendenciasTotal > 0 ? palette.danger : palette.success },
            ]}
          >
            {pendenciasTotal}
          </Text>
          <Text style={styles.cardMeta}>
            {pendenciasTotal === 0
              ? "Tudo em dia neste mês!"
              : `${pendenciasTotal} ${pendenciasTotal === 1 ? "item aguardando" : "itens aguardando"} pagamento`}
          </Text>
        </Card>

        <View style={styles.actions}>
          <Text style={styles.actionsLabel}>Ações rápidas</Text>
          <BigButton
            label="Registrar pagamento"
            onPress={() => navigation.navigate("Mensalidades")}
            variant="primary"
          />
          <BigButton
            label="Registrar contribuição"
            onPress={() => navigation.navigate("Produtos")}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  greeting: {
    gap: spacing.xs,
  },
  greetingHi: {
    ...typography.title,
    color: palette.primary,
  },
  greetingSub: {
    ...typography.body,
    color: palette.textSecondary,
  },
  loading: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  card: {
    gap: spacing.sm,
  },
  cardTouch: {
    gap: spacing.sm,
  },
  cardAlert: {
    borderColor: palette.danger,
    backgroundColor: palette.dangerBg,
  },
  cardOk: {
    borderColor: palette.success,
    backgroundColor: palette.successBg,
  },
  cardLabel: {
    ...typography.label,
    color: palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  adimpRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  adimpValue: {
    ...typography.display,
  },
  adimpHint: {
    ...typography.body,
    color: palette.textSecondary,
  },
  cardMeta: {
    ...typography.body,
    color: palette.textSecondary,
  },
  cardMetaStrong: {
    ...typography.bodyStrong,
    color: palette.textPrimary,
  },
  cardMoneyRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  pendValue: {
    ...typography.display,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    borderRadius: radius.sm,
  },
  actionsLabel: {
    ...typography.subtitle,
    color: palette.textPrimary,
    marginBottom: spacing.xs,
  },
  errorBox: {
    backgroundColor: palette.dangerBg,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  errorText: {
    ...typography.body,
    color: palette.danger,
  },
});
