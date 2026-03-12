/**
 * Static English translations for each registered namespace.
 *
 * This is the single source of truth for server-side English fallbacks.
 * When adding a new namespace, add its English JSON file here.
 * See NAMESPACES.md for the full checklist.
 */
const englishTranslations: Record<string, Record<string, string>> = {
  common: require("@calcom/i18n/locales/en/common.json"),
  pbac: require("@calcom/i18n/locales/en/pbac.json"),
};

export default englishTranslations;
