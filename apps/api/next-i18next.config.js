const path = require("path");
const i18nConfig = require("@calcom/config/next-i18next.config");

/** @type {import("next-i18next").UserConfig} */
const config = {
  ...i18nConfig,
  localePath: path.resolve("../web/public/static/locales"),
};

module.exports = config;
