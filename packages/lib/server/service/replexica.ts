import { ReplexicaEngine } from "@replexica/sdk";

import { REPLEXICA_API_KEY } from "@calcom/lib/constants";

enum Locales {
  AR = "ar",
  CA = "ca",
  DE = "de",
  ES = "es",
  EU = "eu",
  HE = "he",
  ID = "id",
  JA = "ja",
  LV = "lv",
  PL = "pl",
  RO = "ro",
  SR = "sr",
  TH = "th",
  VI = "vi",
  AZ = "az",
  CS = "cs",
  EL = "el",
  ES_419 = "es-419",
  FI = "fi",
  HR = "hr",
  IT = "it",
  KM = "km",
  NL = "nl",
  PT = "pt",
  RU = "ru",
  SV = "sv",
  TR = "tr",
  ZH_CN = "zh-CN",
  BG = "bg",
  DA = "da",
  EN = "en",
  ET = "et",
  FR = "fr",
  HU = "hu",
  IW = "iw",
  KO = "ko",
  NO = "no",
  PT_BR = "pt-BR",
  SK = "sk",
  TA = "ta",
  UK = "uk",
  ZH_TW = "zh-TW",
}

export class ReplexicaService {
  private static engine = new ReplexicaEngine({
    apiKey: REPLEXICA_API_KEY,
  });

  /**
   * Localizes text from one language to another
   * @param text The text to localize
   * @param sourceLocale The source language locale
   * @param targetLocale The target language locale
   * @returns The localized text
   */
  static async localizeText(text: string, sourceLocale: Locales, targetLocale: Locales): Promise<string> {
    if (!text?.trim()) {
      return text;
    }

    try {
      const result = await this.engine.localizeText(text, {
        sourceLocale,
        targetLocale,
      });

      return result;
    } catch (error) {
      return text;
    }
  }

  /**
   * Localizes an array of texts from one language to another
   * @param texts Array of texts to localize
   * @param sourceLocale The source language locale
   * @param targetLocale The target language locale
   * @returns The localized texts array
   */
  static async localizeTexts(
    texts: string[],
    sourceLocale: Locales,
    targetLocale: Locales
  ): Promise<string[]> {
    if (!texts.length) {
      return texts;
    }

    try {
      const result = await this.engine.localizeChat(
        texts.map((text) => ({ name: "NO_NAME", text: text.trim() })),
        {
          sourceLocale,
          targetLocale,
        }
      );

      return result.map((chat: { name: string; text: string }) => chat.text);
    } catch (error) {
      return texts;
    }
  }
}
