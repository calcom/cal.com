const path = require("path");

/** @type {import("next-i18next").UserConfig} */
const config = {
  i18n: {
    defaultLocale: "pt-BR",
    locales: ["pt-BR"],
  },
  fallbackLng: {
    default: ["pt-BR"],
  },
  reloadOnPrerender: process.env.NODE_ENV !== "production",
};

module.exports = config;
