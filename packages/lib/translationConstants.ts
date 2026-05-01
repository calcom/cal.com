/**
 * Supported locales for auto-translation features.
 * Used by both event type and workflow step translations.
 */
export const TRANSLATION_SUPPORTED_LOCALES = [
  "en", // English
  "es", // Spanish
  "de", // German
  "pt", // Portuguese
  "pt-BR", // Portuguese Brazilian
  "fr", // French
  "it", // Italian
  "ar", // Arabic
  "ru", // Russian
  "zh-CN", // Simplified Chinese
  "nl", // Dutch
  "zh-TW", // Traditional Chinese
  "ko", // Korean
  "ja", // Japanese
  "sv", // Swedish
  "da", // Danish
  "is", // Icelandic
  "lt", // Lithuanian
  "nb", // Norwegian Bokmål
] as const;

export type TranslationSupportedLocale = (typeof TRANSLATION_SUPPORTED_LOCALES)[number];
