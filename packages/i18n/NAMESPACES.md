# i18n Namespaces

Translations are split into **namespaces** so that only the keys needed for a given set of pages are loaded. The default namespace is `common`; additional namespaces (e.g. `pbac`) are loaded on demand via `I18nExtend` in a route layout.

## Files to update when adding a namespace

All steps reference a new namespace called `example`.

### 1. Create the JSON files

Add `example.json` to every locale directory under `packages/i18n/locales/`:

```
packages/i18n/locales/en/example.json   <-- source of truth (English)
packages/i18n/locales/fr/example.json
packages/i18n/locales/de/example.json
...                                      (all 44 locales)
```

Locales that don't have translations yet should contain `{}`. They will fall back to the English keys at runtime via `mergeWithEnglishFallback`.

### 2. Register the English fallback

In **`packages/i18n/englishTranslations.ts`**, add the new namespace:

```ts
const englishTranslations: Record<string, Record<string, string>> = {
  common: require("@calcom/i18n/locales/en/common.json"),
  pbac: require("@calcom/i18n/locales/en/pbac.json"),
  example: require("@calcom/i18n/locales/en/example.json"), // <-- add this
};
```

This file is the single source of truth for server-side English fallbacks. If a namespace is not registered here, `loadTranslations` and `mergeWithEnglishFallback` will throw at runtime.

### 3. Add a route layout that loads the namespace

Create a server component that uses `I18nExtend` to overlay the new namespace on top of the parent context:

```tsx
// app/.../example/_components/ExampleNamespaceLayout.tsx
import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { loadTranslations } from "@calcom/i18n/server";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { I18nExtend } from "app/I18nProvider";
import { cookies, headers } from "next/headers";

export default async function ExampleNamespaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale =
    (await getLocale(buildLegacyRequest(await headers(), await cookies()))) ??
    "en";
  const translations = await loadTranslations(locale, "example");

  return (
    <I18nExtend translations={translations} ns="example">
      {children}
    </I18nExtend>
  );
}
```

Then re-export it as the `layout.tsx` for every route group that needs the namespace:

```tsx
// app/.../example/layout.tsx
export { default } from "./_components/ExampleNamespaceLayout";
```

### 4. Add to Lingo.dev config

In **`i18n.json`** (repo root), add the new namespace to the `buckets.json.include` array so Lingo.dev creates automated translation PRs:

```json
"buckets": {
  "json": {
    "include": [
      "packages/i18n/locales/[locale]/common.json",
      "packages/i18n/locales/[locale]/pbac.json",
      "packages/i18n/locales/[locale]/example.json"
    ]
  }
}
```

## Checklist

| Step | File(s) | What |
|------|---------|------|
| 1 | `packages/i18n/locales/*/example.json` | Create JSON files for all locales |
| 2 | `packages/i18n/englishTranslations.ts` | Register English fallback |
| 3 | `app/**/layout.tsx` | Add `I18nExtend` layout for routes that use the namespace |
| 4 | `i18n.json` | Add to Lingo.dev automated translations |

## How it works at runtime

1. The root layout loads `common` translations via `I18nProvider` (the default namespace).
2. A nested route layout (e.g. `PbacNamespaceLayout`) calls `loadTranslations(locale, "pbac")` on the server.
3. `loadTranslations` dynamically imports the locale's `pbac.json` and merges it with the English `pbac.json` fallback (from `englishTranslations.ts`) so missing keys fall back to English.
4. The layout passes the merged translations to `I18nExtend`, which merges them on top of the parent context's translations (`{ ...parent, ...namespace }`).
5. Any component under that layout can use `useLocale()` and access both `common` and `pbac` keys transparently.
