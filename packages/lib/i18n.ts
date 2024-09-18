/* eslint-disable @typescript-eslint/no-var-requires */
const { i18n } = require("@calcom/config/next-i18next.config");

// Workaround for using router.locales from old router
export const locales = i18n.locales as string[];

export const localeOptions = locales.map((locale) => ({
  value: locale,
  label: new Intl.DisplayNames(locale, { type: "language" }).of(locale) || "",
}));

export const defaultLocaleOption = localeOptions.find(
  (locale) => locale.value === i18n.defaultLocale
) as (typeof localeOptions)[number];

// List of known RTL locales, it returnbs rtl or ltr for respective locales
const rtlLocales = ["ar", "he"];

export function getTextDirection(locale: string): "ltr" | "rtl" {
  return rtlLocales.includes(locale) || rtlLocales.includes(locale.split("-")[0]) ? "rtl" : "ltr";
}

export function isRTL(locale: string): boolean {
  return getTextDirection(locale) === "rtl";
}
