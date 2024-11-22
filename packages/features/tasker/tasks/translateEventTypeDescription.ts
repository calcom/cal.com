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

export type TranslateEventTypeDescriptionPayload = z.infer<
  typeof ZTranslateEventTypeDescriptionPayloadSchema
>;

export async function translateEventTypeDescription(payload: string): Promise<void> {
  try {
    const { eventTypeId, description, userLocale, userId } =
      ZTranslateEventTypeDescriptionPayloadSchema.parse(JSON.parse(payload));

    const targetLocales = (["en", "es", "de", "pt", "fr", "it", "ar", "ru", "zh-CN"] as const).filter(
      (locale) => locale !== userLocale && i18nLocales.includes(locale)
    );
    const { ReplexicaService } = await import("@calcom/lib/server/service/replexica");
    const translatedTexts = await Promise.all(
      targetLocales.map((targetLocale) =>
        ReplexicaService.localizeText(description, userLocale, targetLocale)
      )
    );

    await EventTypeTranslationRepository.upsertManyDescriptionTranslations(
      targetLocales.map((targetLocale, index) => ({
        eventTypeId,
        sourceLocale: userLocale,
        targetLocale: targetLocale,
        translatedText: translatedTexts[index],
        userId,
      }))
    );
  } catch (error) {
    logger.error(`Failed to translate event type description:`, error);
    throw error;
  }
}
