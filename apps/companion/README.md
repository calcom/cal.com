# Cal.com Companion

Este aplicativo Expo Router possui builds nativos (iOS/Android), web e uma extensão de navegador gerada via WXT. Para deploy na Vercel precisamos empacotar apenas a versão web estática.

## Build web estático

```bash
yarn workspace cal-companion build:web
```

Esse script roda `expo export --platform web --output-dir dist`, gerando o bundle pronto em `apps/companion/dist`.

Para testar localmente:

```bash
npx serve dist
```

## Configurando deploy na Vercel

1. Crie um projeto novo apontando para este repositório e escolha `apps/companion` como diretório raiz.
2. Use `yarn install --immutable` como Install Command (igual ao apps/web).
3. Sete o Build Command para `yarn workspace cal-companion build:web`.
4. Configure o Output Directory para `apps/companion/dist`.
5. Em “Framework Preset” escolha `Other`, porque não rodamos Next.js aqui.
6. Adicione nas variáveis de ambiente da Vercel os valores necessários, pelo menos `EXPO_PUBLIC_CAL_API_KEY`, que é lido tanto pelo app web (`services/calcom.ts`) quanto pela extensão (`wxt.config.ts` / `extension/entrypoints/background/index.ts`).

## Observações

- O deploy na Vercel só cobre o bundle web estático. Builds nativas (Expo/EAS) e a extensão no Chrome/Firefox continuam seguindo seus próprios pipelines.
- Caso precise behavior semelhante ao apps/web (cron jobs, APIs, etc.) será necessário criar endpoints e um `vercel.json` específico, mas o Companion hoje é apenas client-side.
