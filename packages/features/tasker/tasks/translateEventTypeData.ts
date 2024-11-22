import { z } from "zod";

import { locales as i18nLocales } from "@calcom/lib/i18n";
import logger from "@calcom/lib/logger";
import { EventTypeTranslationRepository } from "@calcom/lib/server/repository/eventTypeTranslation";

export const ZTranslateEventDataPayloadSchema = z.object({
  eventTypeId: z.number(),
  userId: z.number(),
  description: z.optional(z.string()),
  title: z.optional(z.string()),
  userLocale: z.string(),
});

const SUPPORTED_LOCALES = ["en", "es", "de", "pt", "fr", "it", "ar", "ru", "zh-CN"] as const;

export async function translateEventTypeData(payload: string): Promise<void> {
  const { eventTypeId, description, title, userLocale, userId } = ZTranslateEventDataPayloadSchema.parse(
    JSON.parse(payload)
  );

  // Should not be reached
  if (!description && !title) return;

  const targetLocales = SUPPORTED_LOCALES.filter(
    (locale) => locale !== userLocale && i18nLocales.includes(locale)
  );

  const { ReplexicaService } = await import("@calcom/lib/server/service/replexica");

  const results = await Promise.allSettled([
    description &&
      (async () => {
        try {
          const translatedDescriptions = await Promise.all(
            targetLocales.map((targetLocale) =>
              ReplexicaService.localizeText(description, userLocale, targetLocale)
            )
          );

          // Filter out null translations and their corresponding locales
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
          logger.error("Failed to process description translations:", error);
          throw error;
        }
      })(),

    title &&
      (async () => {
        try {
          const translatedTitles = await Promise.all(
            targetLocales.map((targetLocale) =>
              ReplexicaService.localizeText(title, userLocale, targetLocale)
            )
          );

          // Filter out null translations and their corresponding locales
          const validTranslations = translatedTitles
            .map((translatedText, index) => ({
              translatedText,
              targetLocale: targetLocales[index],
            }))
            .filter(
              (item): item is { translatedText: string; targetLocale: (typeof SUPPORTED_LOCALES)[number] } =>
                item.translatedText !== null
            );

          await EventTypeTranslationRepository.upsertManyTitleTranslations(
            validTranslations.map(({ translatedText, targetLocale }) => ({
              eventTypeId,
              sourceLocale: userLocale,
              targetLocale,
              translatedText,
              userId,
            }))
          );
        } catch (error) {
          logger.error("Failed to process title translations:", error);
          throw error;
        }
      })(),
  ]);

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.error(`Translation task ${index} failed:`, result.reason);
    }
  });
}
