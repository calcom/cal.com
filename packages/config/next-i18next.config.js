const path = require("path");

/** @type {import("next-i18next").UserConfig} */
const config = {
  i18n: {
    defaultLocale: "en",
    locales: [
      "ar",
      "cs",
      "da",
      "de",
      "en",
      // "es-419", // Disabled until Crowdin reaches at least 80% completion
      "es",
      "fr",
      "he",
      "it",
      "ja",
      "ko",
      "nl",
      "no",
      "pl",
      "pt-BR",
      "pt",
      "ro",
      "ru",
      "sr",
      "sv",
      "tr",
      "uk",
      "vi",
      "zh-CN",
      "zh-TW",
      "km",
    ],
  },
  fallbackLng: {
    default: ["en"],
    zh: ["zh-CN"],
  },
  reloadOnPrerender: process.env.NODE_ENV !== "production",
};

module.exports = config;
