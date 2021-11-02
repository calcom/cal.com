/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

module.exports = {
  i18n: {
    defaultLocale: "en",
    locales: ["en", "fr", "it", "ru", "es", "de", "pt", "ro", "nl", "pt-BR", "es-419", "ko", "ja"],
  },
  localePath: path.resolve("./public/static/locales"),
};
