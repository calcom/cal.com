import { vi } from "vitest";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => {
    return {
      t: (str: string) => str,
      isLocaleReady: true,
      i18n: {
        language: "en",
        defaultLocale: "en",
        locales: ["en"],
        exists: (key: translationKeys | string) => Boolean(enTranslations[key as translationKeys]),
      },
    };
  },
}));
