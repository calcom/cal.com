const path = require("node:path");

/**
 * # Regex for translation keys
 * This regex matches the following function calls:
 * 1. `t("<some_key>")`,
 * 2. `t("<some_key>", {key: "<some_string>"})`, or
 * 3. `<Trans i18nKey="home_hero_subtitle" t={t}>`
 *
 * It also ensure that we don't match any other similar function calls (e.g. `format("dddd")`).
 *
 * ## Explanation of the regex
 * - (?<!\w): negative lookbehind to ensure that there is no word character before "t" or "i18nKey"
 * - (?: ... ): non-capturing group
 *   - t: for the use of `t("..")` OR `t("..", {key: ".."})`
 *     - \(("[^"]*"): captures a string enclosed in double quotes followed by an opening parenthesis
 *     - (?:,\s*\{[^}]*\})?: optional non-capturing group so that we match the optional interpolation object
 *   - i18nKey=".+"[^\w]: for the usage of `<Trans i18nKey="home_hero_subtitle" t={t}>`
 *
 * */
const translationKeyRegex = /(?<!\w)(?:t\(("[^"]*")(?:,\s*\{[^}]*\})?\)|i18nKey=".+"[^\w])/gi;

/** @type {import("i18n-unused/src/types/index.ts").RunOptions} */
const config = {
  //   localesPath: localePath, //  uncomment to run on all locales (to calculate kb savings)
  localesPath: path.join("./apps/website", "/public/static/locales", "/en"),
  srcPath: "./apps/website",
  srcExtensions: ["ts", "tsx"],
  translationContextSeparator: ":",
  translationKeyMatcher: translationKeyRegex,
  missedTranslationParser: translationKeyRegex,
  ignorePaths: ["node_modules", ".next"],
};

module.exports = config;
