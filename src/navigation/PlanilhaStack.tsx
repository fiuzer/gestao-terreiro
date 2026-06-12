import type { TextStyle } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { palette, typography } from "@/themes";
import { PlanilhaScreen } from "@/screens/PlanilhaScreen";
import { PlanilhaFormScreen } from "@/screens/PlanilhaFormScreen";
import type { PlanilhaRoutes } from "./types";

export type PlanilhaStackParamList = PlanilhaRoutes;

const Stack = createNativeStackNavigator<PlanilhaStackParamList>();

const screenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: palette.primary },
  headerTintColor: palette.textOnPrimary,
  headerTitleStyle: {
    ...(typography.subtitle as TextStyle),
    color: palette.textOnPrimary,
  },
  contentStyle: { backgroundColor: palette.background },
};

export function PlanilhaStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="PlanilhaDetail"
        component={PlanilhaScreen}
        options={{ title: "Planilha" }}
      />
      <Stack.Screen
        name="PlanilhaForm"
        component={PlanilhaFormScreen}
        options={{ title: "Nova planilha", presentation: "modal" }}
      />
    </Stack.Navigator>
  );
}
