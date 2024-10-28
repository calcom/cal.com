import arTranslations from "@calcom/web/public/static/locales/ar/common.json";
import azTranslations from "@calcom/web/public/static/locales/az/common.json";
import bgTranslations from "@calcom/web/public/static/locales/bg/common.json";
import caTranslations from "@calcom/web/public/static/locales/ca/common.json";
import csTranslations from "@calcom/web/public/static/locales/cs/common.json";
import daTranslations from "@calcom/web/public/static/locales/da/common.json";
import deTranslations from "@calcom/web/public/static/locales/de/common.json";
import elTranslations from "@calcom/web/public/static/locales/el/common.json";
import enTranslations from "@calcom/web/public/static/locales/en/common.json";
import es419Translations from "@calcom/web/public/static/locales/es-419/common.json";
import esTranslations from "@calcom/web/public/static/locales/es/common.json";
import etTranslations from "@calcom/web/public/static/locales/et/common.json";
import euTranslations from "@calcom/web/public/static/locales/eu/common.json";
import fiTranslations from "@calcom/web/public/static/locales/fi/common.json";
import frTranslations from "@calcom/web/public/static/locales/fr/common.json";
import heTranslations from "@calcom/web/public/static/locales/he/common.json";
import hrTranslations from "@calcom/web/public/static/locales/hr/common.json";
import huTranslations from "@calcom/web/public/static/locales/hu/common.json";
import idTranslations from "@calcom/web/public/static/locales/id/common.json";
import itTranslations from "@calcom/web/public/static/locales/it/common.json";
import iwTranslations from "@calcom/web/public/static/locales/iw/common.json";
import jaTranslations from "@calcom/web/public/static/locales/ja/common.json";
import kmTranslations from "@calcom/web/public/static/locales/km/common.json";
import koTranslations from "@calcom/web/public/static/locales/ko/common.json";
import lvTranslations from "@calcom/web/public/static/locales/lv/common.json";
import nlTranslations from "@calcom/web/public/static/locales/nl/common.json";
import noTranslations from "@calcom/web/public/static/locales/no/common.json";
import plTranslations from "@calcom/web/public/static/locales/pl/common.json";
import ptBRTranslations from "@calcom/web/public/static/locales/pt-BR/common.json";
import ptTranslations from "@calcom/web/public/static/locales/pt/common.json";
import roTranslations from "@calcom/web/public/static/locales/ro/common.json";
import ruTranslations from "@calcom/web/public/static/locales/ru/common.json";
import skTranslations from "@calcom/web/public/static/locales/sk/common.json";
import srTranslations from "@calcom/web/public/static/locales/sr/common.json";
import svTranslations from "@calcom/web/public/static/locales/sv/common.json";
import taTranslations from "@calcom/web/public/static/locales/ta/common.json";
import thTranslations from "@calcom/web/public/static/locales/th/common.json";
import trTranslations from "@calcom/web/public/static/locales/tr/common.json";
import ukTranslations from "@calcom/web/public/static/locales/uk/common.json";
import viTranslations from "@calcom/web/public/static/locales/vi/common.json";
import zhCNTranslations from "@calcom/web/public/static/locales/zh-CN/common.json";
import zhTWTranslations from "@calcom/web/public/static/locales/zh-TW/common.json";

export const dictionaries = {
  ar: arTranslations,
  az: azTranslations,
  bg: bgTranslations,
  ca: caTranslations,
  cs: csTranslations,
  da: daTranslations,
  de: deTranslations,
  el: elTranslations,
  en: enTranslations,
  es: esTranslations,
  "es-419": es419Translations,
  et: etTranslations,
  eu: euTranslations,
  fi: fiTranslations,
  fr: frTranslations,
  he: heTranslations,
  hr: hrTranslations,
  hu: huTranslations,
  id: idTranslations,
  it: itTranslations,
  iw: iwTranslations,
  ja: jaTranslations,
  km: kmTranslations,
  ko: koTranslations,
  lv: lvTranslations,
  nl: nlTranslations,
  no: noTranslations,
  pl: plTranslations,
  pt: ptTranslations,
  "pt-BR": ptBRTranslations,
  ro: roTranslations,
  ru: ruTranslations,
  sk: skTranslations,
  sr: srTranslations,
  sv: svTranslations,
  ta: taTranslations,
  th: thTranslations,
  tr: trTranslations,
  uk: ukTranslations,
  vi: viTranslations,
  "zh-CN": zhCNTranslations,
  "zh-TW": zhTWTranslations,
} as const;

export type SupportedLocale = keyof typeof dictionaries;
export type Translations = (typeof dictionaries)[SupportedLocale];
export type KeyOfTranslations = keyof Translations;
export const getDictionary = async (locale: SupportedLocale = "en") => {
  return dictionaries[locale];
};
