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
}
