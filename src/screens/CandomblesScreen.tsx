import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BigButton,
  EmptyState,
  ListItem,
  ScreenContainer,
  TemplatePickerModal,
} from "@/components";
import { NomeInputDialog } from "@/components/NomeInputDialog";
import { palette, radius, spacing, touch, typography } from "@/themes";
import { useCandomble } from "@/hooks/useCandomble";
import { useTemplates } from "@/hooks/useTemplates";
import type { Categoria, Orixa, Planilha } from "@/types/models";
import type { CandomblesStackParamList } from "@/navigation/AppNavigator";

type TemplateResumoOption = { id: number; nome: string };

type Nav = NativeStackNavigationProp<
  CandomblesStackParamList,
  "CandomblesHome" | "CandomblesNivel"
>;
type RouteHome = RouteProp<CandomblesStackParamList, "CandomblesHome">;
type RouteNivel = RouteProp<CandomblesStackParamList, "CandomblesNivel">;

export type Crumb = { label: string };

export function CandomblesScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteHome | RouteNivel>();

  const isNivel = route.name === "CandomblesNivel";
  const params = isNivel ? (route as RouteNivel).params : undefined;
  const orixaId = params?.orixaId ?? null;
  const orixaNome = params?.orixaNome ?? null;
  const categoriaId = params?.categoriaId ?? null;
  const breadcrumb: Crumb[] = params?.breadcrumb ?? [{ label: "Candomblé" }];

  const {
    orixas,
    loading,
    error,
    listCategorias,
    listPlanilhas,
    addCategoria,
  } = useCandomble();

  const {
    templates,
    loading: templatesLoading,
    reload: reloadTemplates,
  } = useTemplates();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [planilhas, setPlanilhas] = useState<Planilha[]>([]);
  const [niveLoading, setNivelLoading] = useState(false);
  const [dialog, setDialog] = useState<"categoria" | "templatePicker" | null>(
    null
  );
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: breadcrumb[breadcrumb.length - 1]?.label ?? "Candomblés",
    });
  }, [navigation, breadcrumb]);

  const refreshNivel = useCallback(async () => {
    if (orixaId === null) {
      setCategorias([]);
      setPlanilhas([]);
      return;
    }
    setNivelLoading(true);
    try {
      const [cats, plans] = await Promise.all([
        listCategorias(categoriaId, orixaId),
        listPlanilhas(categoriaId, orixaId),
      ]);
      setCategorias(cats);
      setPlanilhas(plans);
    } finally {
      setNivelLoading(false);
    }
  }, [categoriaId, orixaId, listCategorias, listPlanilhas]);

  useFocusEffect(
    useCallback(() => {
      void refreshNivel();
    }, [refreshNivel])
  );

  const navegarOrixa = (o: Orixa) => {
    navigation.push("CandomblesNivel", {
      orixaId: o.id,
      orixaNome: o.nome,
      categoriaId: null,
      breadcrumb: [...breadcrumb, { label: o.nome }],
    });
  };

  const navegarCategoria = (c: Categoria) => {
    if (orixaId === null) return;
    navigation.push("CandomblesNivel", {
      orixaId,
      orixaNome,
      categoriaId: c.id,
      breadcrumb: [...breadcrumb, { label: c.nome }],
    });
  };

  const abrirPlanilha = (p: Planilha) => {
    navigation.navigate("PlanilhaDetail", { planilhaId: p.id });
  };

  const confirmarCategoria = async (nome: string) => {
    if (orixaId === null) return;
    setSalvando(true);
    try {
      await addCategoria({ nome, pai_id: categoriaId, orixa_id: orixaId });
      setDialog(null);
      await refreshNivel();
    } finally {
      setSalvando(false);
    }
  };

  const abrirWizardPlanilha = (template?: TemplateResumoOption) => {
    if (orixaId === null) return;
    setDialog(null);
    navigation.navigate("PlanilhaForm", {
      tipoModulo: "candombles",
      orixaId,
      categoriaId,
      templateId: template?.id,
      templateNome: template?.nome,
    });
  };

  const abrirCriarPlanilha = async () => {
    if (orixaId === null) return;
    await reloadTemplates();
    if (templates.length > 0) {
      setDialog("templatePicker");
    } else {
      abrirWizardPlanilha();
    }
  };

  const usarTemplate = (templateId: number) => {
    const template = templates.find((t) => t.id === templateId);
    abrirWizardPlanilha(
      template ? { id: template.id, nome: template.nome } : undefined
    );
  };

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator size="large" color={palette.primary} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <EmptyState title="Erro" description={error} />
      </ScreenContainer>
    );
  }

  const isRaiz = orixaId === null;
  const podeCriar = !isRaiz;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Breadcrumb items={breadcrumb} />

      <FlatList
        data={isRaiz ? orixas : categorias}
        keyExtractor={(item) => `${isRaiz ? "o" : "c"}-${item.id}`}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          niveLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title={isRaiz ? "Sem orixás" : "Vazio"}
            description={
              isRaiz
                ? "Os orixás padrão devem aparecer aqui."
                : "Nenhuma categoria neste nível. Crie uma nova."
            }
          />
        }
        renderItem={({ item }) =>
          isRaiz ? (
            <OrixaItem
              orixa={item as Orixa}
              onPress={() => navegarOrixa(item as Orixa)}
            />
          ) : (
            <CategoriaItem
              categoria={item as Categoria}
              onPress={() => navegarCategoria(item as Categoria)}
            />
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          !isRaiz ? (
            <PlanilhasSection planilhas={planilhas} onPress={abrirPlanilha} />
          ) : null
        }
      />

      {podeCriar ? (
        <View style={styles.actions}>
          <BigButton
            label="Nova Categoria"
            variant="secondary"
            onPress={() => setDialog("categoria")}
          />
          <BigButton
            label="Nova Planilha"
            variant="primary"
            onPress={() => {
              void abrirCriarPlanilha();
            }}
          />
        </View>
      ) : null}

      <NomeInputDialog
        visible={dialog === "categoria"}
        title="Nova categoria"
        placeholder="Ex.: Festa de Iemanjá"
        confirmLabel="Criar"
        loading={salvando}
        onConfirm={confirmarCategoria}
        onCancel={() => setDialog(null)}
      />
      <TemplatePickerModal
        visible={dialog === "templatePicker"}
        templates={templates}
        loading={templatesLoading}
        onSelect={(id) => usarTemplate(id)}
        onSkip={() => abrirWizardPlanilha()}
        onCancel={() => setDialog(null)}
      />
    </SafeAreaView>
  );
}

function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <View style={styles.breadcrumb}>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <View key={`${i}-${c.label}`} style={styles.breadcrumbItem}>
            <Text
              numberOfLines={1}
              style={[styles.crumb, last && styles.crumbActive]}
            >
              {c.label}
            </Text>
            {!last ? (
              <Ionicons
                name="chevron-forward"
                size={14}
                color={palette.textMuted}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function OrixaItem({
  orixa,
  onPress,
}: {
  orixa: Orixa;
  onPress: () => void;
}) {
  return (
    <ListItem
      title={orixa.nome}
      onPress={onPress}
      leading={
        <View style={styles.orixaIcon}>
          <Ionicons name="flower-outline" size={22} color={palette.accent} />
        </View>
      }
      trailing={
        <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
      }
    />
  );
}

function CategoriaItem({
  categoria,
  onPress,
}: {
  categoria: Categoria;
  onPress: () => void;
}) {
  return (
    <ListItem
      title={categoria.nome}
      onPress={onPress}
      leading={
        <View style={styles.categoriaIcon}>
          <Ionicons name="folder-outline" size={20} color={palette.primary} />
        </View>
      }
      trailing={
        <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
      }
    />
  );
}

function PlanilhasSection({
  planilhas,
  onPress,
}: {
  planilhas: Planilha[];
  onPress: (p: Planilha) => void;
}) {
  if (planilhas.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Planilhas</Text>
      <View style={styles.sectionList}>
        {planilhas.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onPress(p)}
            style={({ pressed }) => [
              styles.planilhaRow,
              pressed && styles.planilhaRowPressed,
            ]}
            hitSlop={touch.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={`Abrir planilha ${p.nome}`}
          >
            <Ionicons
              name="document-text-outline"
              size={22}
              color={palette.primary}
            />
            <Text style={styles.planilhaTitle} numberOfLines={1}>
              {p.nome}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.textMuted}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  breadcrumbItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  crumb: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  crumbActive: {
    ...typography.bodyStrong,
    color: palette.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
    flexGrow: 1,
  },
  loadingRow: { paddingVertical: spacing.lg, alignItems: "center" },
  separator: { height: spacing.sm },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
  },
  orixaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  categoriaIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginTop: spacing.xl, gap: spacing.sm },
  sectionTitle: {
    ...typography.label,
    color: palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionList: { gap: spacing.sm },
  planilhaRow: {
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
  planilhaRowPressed: { backgroundColor: palette.surfaceAlt },
  planilhaTitle: {
    flex: 1,
    ...typography.bodyStrong,
    color: palette.textPrimary,
  },
});
