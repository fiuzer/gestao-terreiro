import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  BigButton,
  ConfirmDialog,
  EmptyState,
  FAB,
  ListItem,
  MembroFormModal,
  ScreenContainer,
  SectionHeader,
  StatusBadge,
} from "@/components";
import { useMembros } from "@/hooks";
import type { MembroView } from "@/hooks";
import { palette, spacing, typography } from "@/themes";

type FormMode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; membro: MembroView };

export function MembrosScreen() {
  const { membros, loading, error, reload, create, update, setAtivo } = useMembros();
  const [formMode, setFormMode] = useState<FormMode>({ kind: "closed" });
  const [formLoading, setFormLoading] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<MembroView | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const ativos = membros.filter((m) => m.ativo);
  const inativos = membros.filter((m) => !m.ativo);

  const handleSubmit = async (nome: string) => {
    setFormLoading(true);
    try {
      if (formMode.kind === "create") {
        await create({ nome });
      } else if (formMode.kind === "edit") {
        await update({ id: formMode.membro.id, nome });
      }
      setFormMode({ kind: "closed" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      await setAtivo(toggleTarget.id, !toggleTarget.ativo);
      setToggleTarget(null);
    } finally {
      setToggleLoading(false);
    }
  };

  const renderItem = ({ item }: { item: MembroView }) => (
    <ListItem
      title={item.nome}
      onPress={() => setFormMode({ kind: "edit", membro: item })}
      accessibilityLabel={`Editar ${item.nome}`}
      leading={<Avatar name={item.nome} tone={item.ativo ? "primary" : "muted"} />}
      trailing={
        <View style={styles.trailing}>
          <StatusBadge
            status={item.ativo ? "paid" : "neutral"}
            label={item.ativo ? "Ativo" : "Inativo"}
          />
          <BigButton
            label={item.ativo ? "Desativar" : "Reativar"}
            onPress={() => setToggleTarget(item)}
            variant={item.ativo ? "secondary" : "primary"}
            fullWidth={false}
          />
        </View>
      }
    />
  );

  if (loading && membros.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (membros.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Nenhum membro cadastrado"
          description="Adicione os filhos-de-santo do terreiro para controlar as mensalidades."
          actionLabel="Cadastrar membro"
          onAction={() => setFormMode({ kind: "create" })}
        />

        <MembroFormModal
          visible={formMode.kind !== "closed"}
          membro={formMode.kind === "edit" ? formMode.membro : null}
          loading={formLoading}
          onCancel={() => setFormMode({ kind: "closed" })}
          onConfirm={handleSubmit}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={[...ativos, ...inativos]}
        keyExtractor={(item) => `${item.id}`}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <SectionHeader
            title="Membros"
            description={`${ativos.length} ativos · ${inativos.length} inativos`}
          />
        }
        ListFooterComponent={
          inativos.length > 0 ? (
            <Text style={styles.footnote}>
              Membros inativos permanecem no histórico, mas não aparecem em novos meses.
            </Text>
          ) : null
        }
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={() => void reload()}
        showsVerticalScrollIndicator={false}
      />

      <FAB label="Novo membro" onPress={() => setFormMode({ kind: "create" })} />

      <MembroFormModal
        visible={formMode.kind !== "closed"}
        membro={formMode.kind === "edit" ? formMode.membro : null}
        loading={formLoading}
        onCancel={() => setFormMode({ kind: "closed" })}
        onConfirm={handleSubmit}
      />

      <ConfirmDialog
        visible={toggleTarget !== null}
        title={toggleTarget?.ativo ? "Desativar membro?" : "Reativar membro?"}
        message={
          toggleTarget?.ativo
            ? `${toggleTarget.nome} deixará de aparecer em novos meses, mas o histórico será preservado.`
            : `${toggleTarget?.nome ?? ""} voltará a aparecer nas mensalidades dos próximos meses.`
        }
        confirmLabel={toggleTarget?.ativo ? "Desativar" : "Reativar"}
        cancelLabel="Cancelar"
        destructive={Boolean(toggleTarget?.ativo)}
        loading={toggleLoading}
        onCancel={() => setToggleTarget(null)}
        onConfirm={handleToggle}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  trailing: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  separator: {
    height: spacing.sm,
  },
  list: {
    paddingBottom: 96,
    gap: spacing.xs,
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
  footnote: {
    ...typography.caption,
    color: palette.textMuted,
    marginTop: spacing.lg,
    textAlign: "center",
  },
});
