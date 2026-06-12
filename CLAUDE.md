@AGENTS.md

## Build (Android)

Build de teste (APK instalável):

```
eas build --platform android --profile preview
```

Build de produção (AAB Play Store):

```
eas build --platform android --profile production
```

Identificador do app: `com.ekedymeire.gestaoTerreiro` (configurado em `app.json`).
Perfis EAS definidos em `eas.json`.
