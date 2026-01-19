import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";

import en from "@/locales/en.json";

const i18n = new I18n({
  en,
});

i18n.defaultLocale = "en";
i18n.locale = getLocales()[0]?.languageCode ?? "en";
i18n.enableFallback = true;

export const t = (key: string, options?: Record<string, unknown>) => {
  return i18n.t(key, options);
};

export { i18n };
