const path = require("path");

/** @type {import("next-i18next").UserConfig} */
const config = {
  i18n: {
    defaultLocale: "en",
    locales: [
      "ar",
      "az",
      "ca",
      "cs",
      "da",
      "de",
      "en",
      "es-419",
      "es",
      "et",
      "fr",
      "he",
      "hu",
      "it",
      "ja",
      "km",
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
    ],
  },
  fallbackLng: {
    default: ["en"],
    zh: ["zh-CN"],
  },
  reloadOnPrerender: process.env.NODE_ENV !== "production",
};

module.exports = config;
