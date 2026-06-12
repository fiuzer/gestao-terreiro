import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { palette, typography } from "@/themes";

export type AvatarProps = {
  name: string;
  size?: number;
  tone?: "primary" | "accent" | "muted";
  style?: StyleProp<ViewStyle>;
};

function initialOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const first = trimmed[0];
  return first.toLocaleUpperCase("pt-BR");
}

export function Avatar({ name, size = 44, tone = "primary", style }: AvatarProps) {
  const bg =
    tone === "accent"
      ? palette.accent
      : tone === "muted"
        ? palette.surfaceAlt
        : palette.primaryLight;
  const fg = tone === "muted" ? palette.textSecondary : palette.white;

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Inicial de ${name}`}
    >
      <Text style={[styles.text, { color: fg, fontSize: Math.round(size * 0.45) }]}>
        {initialOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    ...typography.bodyStrong,
  },
});
