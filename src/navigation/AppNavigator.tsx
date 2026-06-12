import { StyleSheet, Text, View } from "react-native";
import type { TextStyle } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import type { Theme as NavigationTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, spacing, typography } from "@/themes";
import {
  InicioScreen,
  CandomblesScreen,
  EventosScreen,
  MensalidadesScreen,
  MembrosScreen,
  ProdutosScreen,
  MaisScreen,
  PlanilhaScreen,
  PlanilhaFormScreen,
  CaixaScreen,
} from "@/screens";
import type { Crumb } from "@/screens/CandomblesScreen";
import type { PlanilhaFormParams } from "@/navigation/types";

export type InicioStackParamList = {
  InicioHome: undefined;
};

export type CandomblesStackParamList = {
  CandomblesHome: undefined;
  CandomblesNivel: {
    orixaId: number;
    orixaNome: string | null;
    categoriaId: number | null;
    breadcrumb: Crumb[];
  };
  PlanilhaDetail: { planilhaId: number };
  PlanilhaForm: PlanilhaFormParams;
};

export type MensalidadesStackParamList = {
  MensalidadesHome: undefined;
  Membros: undefined;
};

export type ProdutosStackParamList = {
  ProdutosHome: undefined;
};

export type MaisStackParamList = {
  MaisHome: undefined;
  Eventos: undefined;
  PlanilhaDetail: { planilhaId: number };
  PlanilhaForm: PlanilhaFormParams;
};

export type RootTabParamList = {
  Inicio: undefined;
  Candombles: undefined;
  Mensalidades: undefined;
  Produtos: undefined;
  Caixa: undefined;
  Mais: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const InicioStack = createNativeStackNavigator<InicioStackParamList>();
const CandomblesStack = createNativeStackNavigator<CandomblesStackParamList>();
const MensalidadesStack =
  createNativeStackNavigator<MensalidadesStackParamList>();
const ProdutosStack = createNativeStackNavigator<ProdutosStackParamList>();
const MaisStack = createNativeStackNavigator<MaisStackParamList>();

const navigationTheme: NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.primary,
    background: palette.background,
    card: palette.primary,
    text: palette.textOnPrimary,
    border: palette.primaryDark,
    notification: palette.accent,
  },
  fonts: DefaultTheme.fonts,
};

const stackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: palette.primary },
  headerTintColor: palette.textOnPrimary,
  headerTitleStyle: {
    ...(typography.subtitle as TextStyle),
    color: palette.textOnPrimary,
  },
  contentStyle: { backgroundColor: palette.background },
};

function InicioStackNavigator() {
  return (
    <InicioStack.Navigator screenOptions={stackScreenOptions}>
      <InicioStack.Screen
        name="InicioHome"
        component={InicioScreen}
        options={{ title: "Início" }}
      />
    </InicioStack.Navigator>
  );
}

function CandomblesStackNavigator() {
  return (
    <CandomblesStack.Navigator screenOptions={stackScreenOptions}>
      <CandomblesStack.Screen
        name="CandomblesHome"
        component={CandomblesScreen}
        options={{ title: "Candomblés" }}
      />
      <CandomblesStack.Screen
        name="CandomblesNivel"
        component={CandomblesScreen}
      />
      <CandomblesStack.Screen
        name="PlanilhaDetail"
        component={PlanilhaScreen}
        options={{ title: "Planilha" }}
      />
      <CandomblesStack.Screen
        name="PlanilhaForm"
        component={PlanilhaFormScreen}
        options={{ title: "Nova planilha", presentation: "modal" }}
      />
    </CandomblesStack.Navigator>
  );
}

function MensalidadesStackNavigator() {
  return (
    <MensalidadesStack.Navigator screenOptions={stackScreenOptions}>
      <MensalidadesStack.Screen
        name="MensalidadesHome"
        component={MensalidadesScreen}
        options={{ title: "Mensalidades" }}
      />
      <MensalidadesStack.Screen
        name="Membros"
        component={MembrosScreen}
        options={{ title: "Membros" }}
      />
    </MensalidadesStack.Navigator>
  );
}

function ProdutosStackNavigator() {
  return (
    <ProdutosStack.Navigator screenOptions={stackScreenOptions}>
      <ProdutosStack.Screen
        name="ProdutosHome"
        component={ProdutosScreen}
        options={{ title: "Produtos" }}
      />
    </ProdutosStack.Navigator>
  );
}

function MaisStackNavigator() {
  return (
    <MaisStack.Navigator screenOptions={stackScreenOptions}>
      <MaisStack.Screen
        name="MaisHome"
        component={MaisScreen}
        options={{ title: "Mais" }}
      />
      <MaisStack.Screen
        name="Eventos"
        component={EventosScreen}
        options={{ title: "Eventos & Temporários" }}
      />
      <MaisStack.Screen
        name="PlanilhaDetail"
        component={PlanilhaScreen}
        options={{ title: "Planilha" }}
      />
      <MaisStack.Screen
        name="PlanilhaForm"
        component={PlanilhaFormScreen}
        options={{ title: "Novo evento", presentation: "modal" }}
      />
    </MaisStack.Navigator>
  );
}

type TabGlyph = "home" | "tree" | "people" | "list" | "wallet" | "more";

const TAB_ICONS: Record<
  TabGlyph,
  {
    focused: React.ComponentProps<typeof Ionicons>["name"];
    unfocused: React.ComponentProps<typeof Ionicons>["name"];
  }
> = {
  home: { focused: "home", unfocused: "home-outline" },
  tree: { focused: "leaf", unfocused: "leaf-outline" },
  people: { focused: "people", unfocused: "people-outline" },
  list: { focused: "cart", unfocused: "cart-outline" },
  wallet: { focused: "wallet", unfocused: "wallet-outline" },
  more: {
    focused: "ellipsis-horizontal-circle",
    unfocused: "ellipsis-horizontal",
  },
};

function TabIcon({ glyph, focused }: { glyph: TabGlyph; focused: boolean }) {
  const pair = TAB_ICONS[glyph];
  return (
    <View style={styles.iconWrap}>
      <Ionicons
        name={focused ? pair.focused : pair.unfocused}
        size={24}
        color={focused ? palette.accent : palette.surfaceAlt}
      />
    </View>
  );
}

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = {
    ...styles.tabBar,
    height: styles.tabBar.height + insets.bottom,
    paddingBottom: spacing.sm + insets.bottom,
  };
  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle,
          tabBarActiveTintColor: palette.accent,
          tabBarInactiveTintColor: palette.surfaceAlt,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
          sceneStyle: { backgroundColor: palette.background },
        }}
      >
        <Tab.Screen
          name="Inicio"
          component={InicioStackNavigator}
          options={{
            title: "Início",
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph="home" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Candombles"
          component={CandomblesStackNavigator}
          options={{
            title: "Candomblés",
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph="tree" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Mensalidades"
          component={MensalidadesStackNavigator}
          options={{
            title: "Mensalidades",
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph="people" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Produtos"
          component={ProdutosStackNavigator}
          options={{
            title: "Produtos",
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph="list" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Caixa"
          component={CaixaScreen}
          options={{
            title: "Caixa",
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph="wallet" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Mais"
          component={MaisStackNavigator}
          options={{
            title: "Mais",
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph="more" focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: palette.primary,
    borderTopColor: palette.primaryDark,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    height: 64,
  },
  tabItem: {
    paddingVertical: spacing.xs,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
