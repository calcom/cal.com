import { z } from "zod";

import { locales as i18nLocales } from "@calcom/lib/i18n";
import logger from "@calcom/lib/logger";
import { EventTypeTranslationRepository } from "@calcom/lib/server/repository/eventTypeTranslation";
import { EventTypeAutoTranslatedField } from "@calcom/prisma/enums";

export const ZTranslateEventDataPayloadSchema = z.object({
  eventTypeId: z.number(),
  userId: z.number(),
  description: z.string().nullable().optional(),
  title: z.string().optional(),
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

async function processTranslations({
  text,
  userLocale,
  eventTypeId,
  userId,
  field,
}: {
  text: string;
  field: EventTypeAutoTranslatedField;
} & z.infer<typeof ZTranslateEventDataPayloadSchema>) {
  const { ReplexicaService } = await import("@calcom/lib/server/service/replexica");

  try {
    const targetLocales = SUPPORTED_LOCALES.filter(
      (locale) => locale !== userLocale && i18nLocales.includes(locale)
    );

    const translations = await Promise.all(
      targetLocales.map((targetLocale) => ReplexicaService.localizeText(text, userLocale, targetLocale))
    );

    // Filter out null translations and their corresponding locales
    const validTranslations = translations
      .filter((trans): trans is string => trans !== null)
      .map((trans, index) => ({
        translatedText: trans,
        targetLocale: targetLocales[index],
      }));

    if (validTranslations.length > 0) {
      const translationData = validTranslations.map(({ translatedText, targetLocale }) => ({
        eventTypeId,
        sourceLocale: userLocale,
        targetLocale,
        translatedText,
        userId,
      }));

      const upsertMany =
        field === EventTypeAutoTranslatedField.DESCRIPTION
          ? EventTypeTranslationRepository.upsertManyDescriptionTranslations
          : EventTypeTranslationRepository.upsertManyTitleTranslations;

      await upsertMany(translationData);
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
