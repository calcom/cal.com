import { captureException } from "@sentry/nextjs";
import { createInstance } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";

const i18nInstanceCache = new Map<string, any>();
const MAX_RETRIES = 3;

async function loadFallbackTranslations() {
  try {
    const res = await fetch(`${WEBAPP_URL}/static/locales/en/common.json`);
    if (!res.ok) {
      throw new Error(`Failed to fetch fallback translations: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    captureException(error, {
      extra: {
        context: "fallback_translations",
        url: `${WEBAPP_URL}/static/locales/en/common.json`,
      },
    });
    console.error("Could not fetch fallback translations:", error);
  }
  return {};
}

async function loadTranslations(locale: string, ns: string) {
  let retries = 0;
  let lastError = null;

  while (retries < MAX_RETRIES) {
    try {
      const url = `${WEBAPP_URL}/static/locales/${locale}/${ns}.json`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch translations: ${response.status}, attempt ${
            retries + 1
          }/${MAX_RETRIES} for ${locale}/${ns}`
        );
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      retries++;

      if (retries < MAX_RETRIES) {
        // Add a small delay between retries to give the network time to recover
        const delay = Math.pow(2, retries) * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      captureException(error, {
        extra: {
          context: "translation_fetch",
          locale,
          namespace: ns,
          attempt: retries,
          url: `${WEBAPP_URL}/static/locales/${locale}/${ns}.json`,
        },
      });
    }
  }

  // All retries failed, report this specific scenario with context
  captureException(lastError, {
    extra: {
      context: "translation_fetch_all_failed",
      locale,
      namespace: ns,
      attempts: MAX_RETRIES,
      url: `${WEBAPP_URL}/static/locales/${locale}/${ns}.json`,
    },
  });
  console.error(
    `Failed to load translations for ${locale}/${ns} after ${MAX_RETRIES} attempts, using fallback`
  );

  const fallbackTranslations = await loadFallbackTranslations();
  return fallbackTranslations;
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
  if (Object.keys(resources).length > 0) {
    i18nInstanceCache.set(cacheKey, _i18n);
  }
  return _i18n.getFixedT(locale, ns);
};
