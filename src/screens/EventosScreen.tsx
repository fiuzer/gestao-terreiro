import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ConfirmDialog,
  EmptyState,
  FAB,
  ScreenContainer,
} from "@/components";
import { useEventosList } from "@/hooks/useEventosList";
import type { Planilha } from "@/types/models";
import type { MaisStackParamList } from "@/navigation/AppNavigator";
import { palette, radius, spacing, touch, typography } from "@/themes";
import { formatMonthYear } from "@/utils/format";

type Nav = NativeStackNavigationProp<MaisStackParamList, "Eventos">;

export function EventosScreen() {
  const navigation = useNavigation<Nav>();
  const { eventos, loading, error, reload, deleteEvento } = useEventosList();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const [pendingDelete, setPendingDelete] = useState<Planilha | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteEvento(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const renderItem = ({ item }: { item: Planilha }) => {
    const periodoLabel =
      item.mes && item.ano ? formatMonthYear(item.mes, item.ano) : null;

    return (
      <Pressable
        onPress={() =>
          navigation.navigate("PlanilhaDetail", { planilhaId: item.id })
        }
        onLongPress={() => setPendingDelete(item)}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${item.nome}`}
        accessibilityHint="Pressione longo para excluir"
      >
        <View style={styles.cardIcon}>
          <Ionicons name="document-text" size={22} color={palette.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.nome}
          </Text>
          {periodoLabel ? (
            <Text style={styles.cardMeta}>{periodoLabel}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => setPendingDelete(item)}
          hitSlop={touch.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={`Excluir ${item.nome}`}
          style={({ pressed }) => [
            styles.deleteBtn,
            pressed && styles.deleteBtnPressed,
          ]}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={palette.danger}
          />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <ScreenContainer padded={false}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && eventos.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : (
        <FlatList
          data={eventos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="Nenhum evento cadastrado"
              description="Crie planilhas temporárias para controlar bingos, rifas e outros eventos do terreiro."
              actionLabel="Criar evento"
              onAction={() =>
                navigation.navigate("PlanilhaForm", {
                  tipoModulo: "geral",
                  orixaId: null,
                  categoriaId: null,
                })
              }
            />
          }
          refreshing={loading}
          onRefresh={() => void reload()}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        label="Novo evento"
        onPress={() =>
          navigation.navigate("PlanilhaForm", {
            tipoModulo: "geral",
            orixaId: null,
            categoriaId: null,
          })
        }
        accessibilityLabel="Criar novo evento"
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Excluir evento?"
        message={
          pendingDelete
            ? `"${pendingDelete.nome}" e todos os seus lançamentos serão removidos permanentemente.`
            : undefined
        }
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 96,
    flexGrow: 1,
  },
  separator: {
    height: spacing.sm,
  },
  card: {
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
  cardPressed: {
    backgroundColor: palette.surfaceAlt,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...typography.bodyStrong,
    color: palette.textPrimary,
  },
  cardMeta: {
    ...typography.caption,
    color: palette.textMuted,
  },
  deleteBtn: {
    width: touch.iconButton,
    height: touch.iconButton,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  deleteBtnPressed: {
    backgroundColor: palette.dangerBg,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.huge,
  },
  errorBox: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: palette.dangerBg,
    borderRadius: radius.md,
  },
  errorText: {
    ...typography.body,
    color: palette.danger,
  },
});
