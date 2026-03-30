import { getTranslationService } from "@calcom/features/di/containers/TranslationService";
import { getEventTypeTranslationRepository } from "@calcom/features/eventTypeTranslation/di/EventTypeTranslationRepository.container";
import logger from "@calcom/lib/logger";
import { EventTypeAutoTranslatedField } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZTranslateEventDataPayloadSchema = z.object({
  eventTypeId: z.number(),
  userId: z.number(),
  description: z.string().nullable().optional(),
  title: z.string().optional(),
  userLocale: z.string(),
});

async function processTranslations({
  text,
  userLocale,
  eventTypeId,
  userId,
  field,
}: {
  text: string;
  userLocale: string;
  eventTypeId: number;
  userId: number;
  field: EventTypeAutoTranslatedField;
}): Promise<void> {
  try {
    const translationService = await getTranslationService();
    const result = await translationService.translateText({ text, sourceLocale: userLocale });

    if (result.translations.length > 0) {
      const translationData = result.translations.map(({ translatedText, targetLocale }) => ({
        eventTypeId,
        sourceLocale: userLocale,
        targetLocale,
        translatedText,
        userId,
      }));

      const eventTypeTranslationRepository = getEventTypeTranslationRepository();
      if (field === EventTypeAutoTranslatedField.DESCRIPTION) {
        await eventTypeTranslationRepository.upsertManyDescriptionTranslations(translationData);
      } else {
        await eventTypeTranslationRepository.upsertManyTitleTranslations(translationData);
      }
    }

    if (result.failedLocales.length > 0) {
      logger.warn(`Failed to translate event type ${field} to locales: ${result.failedLocales.join(", ")}`);
    }
  } catch (error) {
    logger.error(`Failed to process ${field} translations:`, error);
  }
}

export async function translateEventTypeData(payload: string): Promise<void> {
  const { eventTypeId, description, title, userLocale, userId } = ZTranslateEventDataPayloadSchema.parse(
    JSON.parse(payload)
  );

  await Promise.all([
    description &&
      processTranslations({
        text: description,
        userLocale,
        eventTypeId,
        userId,
        field: EventTypeAutoTranslatedField.DESCRIPTION,
      }),
    title &&
      processTranslations({
        text: title,
        userLocale,
        eventTypeId,
        userId,
        field: EventTypeAutoTranslatedField.TITLE,
      }),
  ]);
}
