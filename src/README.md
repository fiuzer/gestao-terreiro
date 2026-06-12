# Estrutura `src/`

Organização do código do app Gestão do Terreiro (Expo SDK 54).

| Pasta | Responsabilidade |
| --- | --- |
| `screens/` | Telas do app (cada arquivo = uma rota). |
| `components/` | Componentes reutilizáveis de UI (botões, inputs, cards). |
| `navigation/` | Configuração de `@react-navigation` (bottom tabs + stacks). |
| `db/` | Inicialização e migrações do `expo-sqlite`, queries reutilizáveis. |
| `hooks/` | Hooks customizados (acesso a dados, formatação, navegação). |
| `themes/` | Cores, tipografia, espaçamentos, helpers de tema. |
| `types/` | Tipos TS compartilhados (modelos de domínio, props comuns). |
| `utils/` | Funções utilitárias puras (formatadores, validadores, datas). |

Importações usam o alias `@/...` (configurado em `tsconfig.json`), por exemplo:

```ts
import { palette } from "@/themes/colors";
import { useDatabase } from "@/hooks/useDatabase";
```
