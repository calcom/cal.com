import process from "node:process";
const i18n = require("../../i18n.json");

/** @type {import("next-i18next").UserConfig} */
const config = {
  i18n: {
    defaultLocale: i18n.locale.source,
    locales: i18n.locale.targets.concat([i18n.locale.source]),
  },
  fallbackLng: {
    default: ["en"],
    zh: ["zh-CN"],
  },
  reloadOnPrerender: process.env.NODE_ENV !== "production",
};

module.exports = config;
