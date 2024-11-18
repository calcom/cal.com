import { ReplexicaEngine } from "@replexica/sdk";

import { REPLEXICA_API_KEY } from "@calcom/lib/constants";

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
  static async localizeText(text: string, sourceLocale: string, targetLocale: string): Promise<string> {
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
      return texts;
    }
  }
}
