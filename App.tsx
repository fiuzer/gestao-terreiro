import { Suspense } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SQLiteProvider } from "expo-sqlite";
import { DATABASE_NAME, initDB } from "@/db/database";
import { palette, spacing, typography } from "@/themes";
import { AppNavigator } from "@/navigation/AppNavigator";

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={palette.accent} />
      <Text style={styles.loadingText}>Carregando banco de dados…</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={palette.primary} />
      <Suspense fallback={<LoadingScreen />}>
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          onInit={initDB}
          useSuspense
        >
          <AppNavigator />
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.background,
    gap: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: palette.textSecondary,
  },
});
