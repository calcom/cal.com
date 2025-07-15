import type deTranslations from "@calcom/web/public/static/locales/de/common.json";
import type enTranslations from "@calcom/web/public/static/locales/en/common.json";
import type esTranslations from "@calcom/web/public/static/locales/es/common.json";
import type frTranslations from "@calcom/web/public/static/locales/fr/common.json";
import type nlTranslations from "@calcom/web/public/static/locales/nl/common.json";
import type ptBrTranslations from "@calcom/web/public/static/locales/pt-BR/common.json";

export type enTranslationKeys = keyof typeof enTranslations;
export type frTranslationKeys = keyof typeof frTranslations;
export type deTranslationKeys = keyof typeof deTranslations;
export type esTranslationKeys = keyof typeof esTranslations;
export type ptBrTranslationKeys = keyof typeof ptBrTranslations;
export type nlTranslationKeys = keyof typeof nlTranslations;
export type translationKeys =
  | enTranslationKeys
  | frTranslationKeys
  | deTranslationKeys
  | esTranslationKeys
  | ptBrTranslationKeys
  | nlTranslationKeys;

export const FR = "fr";
export const EN = "en";
export const PT_BR = "pt-BR";
export const DE = "de";
export const ES = "es";
export const NL = "nl";
export const CAL_PROVIDER_LANGUAUES = [FR, EN, PT_BR, DE, ES, NL] as const;
export type CalProviderLanguagesType = (typeof CAL_PROVIDER_LANGUAUES)[number];

type i18nFrProps = {
  labels?: Partial<Record<frTranslationKeys, string>>;
  language?: "fr";
};

type i18nEnProps = {
  labels?: Partial<Record<enTranslationKeys, string>>;
  language?: "en";
};

type i18nPtBrProps = {
  labels?: Partial<Record<ptBrTranslationKeys, string>>;
  language?: "pt-BR";
};

type i18nDeProps = {
  labels?: Partial<Record<deTranslationKeys, string>>;
  language?: "de";
};

type i18nEsProps = {
  labels?: Partial<Record<esTranslationKeys, string>>;
  language?: "es";
};

type i18nNlProps = {
  labels?: Partial<Record<nlTranslationKeys, string>>;
  language?: "nl";
};

export type i18nProps = i18nFrProps | i18nEnProps | i18nPtBrProps | i18nDeProps | i18nEsProps | i18nNlProps;
