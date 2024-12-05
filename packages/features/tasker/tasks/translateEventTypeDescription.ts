import { z } from "zod";

import { locales as i18nLocales } from "@calcom/lib/i18n";
import logger from "@calcom/lib/logger";
import { EventTypeTranslationRepository } from "@calcom/lib/server/repository/eventTypeTranslation";

export const ZTranslateEventTypeDescriptionPayloadSchema = z.object({
  eventTypeId: z.number(),
  userId: z.number(),
  description: z.string(),
  userLocale: z.string(),
});

const SUPPORTED_LOCALES = [
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
] as const;

export async function translateEventTypeDescription(payload: string): Promise<void> {
  const { eventTypeId, description, userLocale, userId } = ZTranslateEventTypeDescriptionPayloadSchema.parse(
    JSON.parse(payload)
  );

  const targetLocales = SUPPORTED_LOCALES.filter(
    (locale) => locale !== userLocale && i18nLocales.includes(locale)
  );

  const { ReplexicaService } = await import("@calcom/lib/server/service/replexica");
  try {
    const translatedDescriptions = await Promise.all(
      targetLocales.map((targetLocale) =>
        ReplexicaService.localizeText(description, userLocale, targetLocale)
      )
    );

    const validTranslations = translatedDescriptions
      .map((translatedText, index) => ({
        translatedText,
        targetLocale: targetLocales[index],
      }))
      .filter(
        (item): item is { translatedText: string; targetLocale: (typeof SUPPORTED_LOCALES)[number] } =>
          item.translatedText !== null
      );

    if (validTranslations.length > 0) {
      await EventTypeTranslationRepository.upsertManyDescriptionTranslations(
        validTranslations.map(({ translatedText, targetLocale }) => ({
          eventTypeId,
          sourceLocale: userLocale,
          targetLocale,
          translatedText,
          userId,
        }))
      );
    }
  } catch (error) {
    logger.error("Failed to process event type description translations:", error);
  }
}
