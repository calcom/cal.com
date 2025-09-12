import type { LocaleCode } from "@lingo.dev/_spec";
import { LingoDotDevEngine } from "lingo.dev/sdk";

import { LINGO_DOT_DEV_API_KEY } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

export class LingoDotDevService {
  private static engine = new LingoDotDevEngine({
    apiKey: LINGO_DOT_DEV_API_KEY,
  });

  /**
   * Localizes text from one language to another
   * @param text The text to localize
   * @param sourceLocale The source language locale
   * @param targetLocale The target language locale
   * @returns The localized text
   */
  static async localizeText(
    text: string,
    sourceLocale: string,
    targetLocale: string
  ): Promise<string | null> {
    if (!text?.trim()) {
      return null;
    }

    try {
      const result = await this.engine.localizeText(text, {
        sourceLocale,
        targetLocale,
      });

      return result;
    } catch (error) {
      logger.error(`LingoDotDevEngine.localizeText() failed for targetLocale: ${targetLocale} - ${error}`);
      return null;
    }
  }

  /**
   * Localize a text string to multiple target locales
   * @param text The text to localize
   * @param sourceLocale The source language locale
   * @param targetLocales Array of the target language locales
   * @returns The localized texts
   */
  static async batchLocalizeText(
    text: string,
    sourceLocale: string,
    targetLocales: string[]
  ): Promise<string[]> {
    try {
      const result = await this.engine.batchLocalizeText(text, {
        // TODO: LocaleCode is hacky, use our locale mapping instead.
        sourceLocale: sourceLocale as LocaleCode,
        targetLocales: targetLocales as LocaleCode[],
      });

      return result;
    } catch (error) {
      logger.error(`LingoDotDevEngine.batchLocalizeText() failed: ${error}`);
      return [];
    }
  }

  /**
   * Localizes an array of texts from one language to another
   * @param texts Array of texts to localize
   * @param sourceLocale The source language locale
   * @param targetLocale The target language locale
   * @returns The localized texts array
   */
  static async localizeTexts(texts: string[], sourceLocale: string, targetLocale: string): Promise<string[]> {
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
      logger.error(`LingoDotDevEngine.localizeTexts() failed: ${error}`);
      return texts;
    }
  }
}
