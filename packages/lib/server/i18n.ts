import { createInstance } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";

const i18nInstanceCache = new Map<string, any>();

async function loadFallbackTranslations() {
  try {
    const res = await fetch(`${WEBAPP_URL}/static/locales/en/common.json`);
    if (res) {
      return await res.json();
    }
  } catch {
    console.error("Could not fetch fallback translations.");
  }
  return;
}

async function loadTranslations(locale: string, ns: string) {
  try {
    const url = `${WEBAPP_URL}/static/locales/${locale}/${ns}.json`;
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    const fallbackTranslations = await loadFallbackTranslations();
    return fallbackTranslations ?? {};
  }
}

export const getTranslation = async (locale: string, ns: string) => {
  const cacheKey = `${locale}-${ns}`;
  if (i18nInstanceCache.has(cacheKey)) {
    return i18nInstanceCache.get(cacheKey).getFixedT(locale, ns);
  }

  const resources = await loadTranslations(locale, ns);

  const _i18n = createInstance();
  _i18n.init({
    lng: locale,
    resources: {
      [locale]: {
        [ns]: resources,
      },
    },
    fallbackLng: "en",
  });

  i18nInstanceCache.set(cacheKey, _i18n);
  return _i18n.getFixedT(locale, ns);
};
