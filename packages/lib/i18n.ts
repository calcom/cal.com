/* eslint-disable @typescript-eslint/no-var-requires */
const { i18n } = require("@calcom/config/next-i18next.config");

// Workaround for using router.locales from old router
export const locales = i18n.locales as string[];

export const localeOptions = locales.map((locale) => ({
  value: locale,
  label: new Intl.DisplayNames(locale, { type: "language" }).of(locale) || "",
}));
