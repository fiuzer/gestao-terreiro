import { StyleSheet, TextInput, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, radius, spacing, touch } from "@/themes";

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  testID?: string;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Buscar...",
  accessibilityLabel,
  testID,
}: SearchBarProps) {
  const hasValue = value.length > 0;

  return (
    <View style={styles.container} testID={testID}>
      <Ionicons
        name="search"
        size={20}
        color={palette.textMuted}
        style={styles.icon}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        style={styles.input}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
      />
      {hasValue ? (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={touch.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Limpar busca"
          style={({ pressed }) => [
            styles.clearBtn,
            pressed && styles.clearBtnPressed,
          ]}
        >
          <Ionicons
            name="close-circle"
            size={20}
            color={palette.textMuted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
  },
  clearBtn: {
    paddingLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearBtnPressed: {
    opacity: 0.6,
  },
});
