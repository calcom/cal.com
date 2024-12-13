import { prisma } from "@calcom/prisma";
import type { EventTypeTranslation } from "@calcom/prisma/client";
import { EventTypeAutoTranslatedField } from "@calcom/prisma/enums";

export type CreateEventTypeTranslation = Omit<
  EventTypeTranslation,
  | "uid"
  | "createdAt"
  | "createdBy"
  | "updatedAt"
  | "updatedBy"
  | "eventType"
  | "field"
  | "creator"
  | "updater"
> & { userId: number };

export class EventTypeTranslationRepository {
  static async upsertManyTitleTranslations(translations: Array<CreateEventTypeTranslation>) {
    return await Promise.all(
      translations.map(({ userId, ...translation }) => {
        return prisma.eventTypeTranslation.upsert({
          where: {
            eventTypeId_field_targetLocale: {
              eventTypeId: translation.eventTypeId,
              field: EventTypeAutoTranslatedField.TITLE,
              targetLocale: translation.targetLocale,
            },
          },
          update: {
            translatedText: translation.translatedText,
            updatedBy: userId,
          },
          create: {
            ...translation,
            field: EventTypeAutoTranslatedField.TITLE,
            createdBy: userId,
          },
        });
      })
    );
  }

  static async upsertManyDescriptionTranslations(translations: Array<CreateEventTypeTranslation>) {
    return await Promise.all(
      translations.map(({ userId, ...translation }) => {
        return prisma.eventTypeTranslation.upsert({
          where: {
            eventTypeId_field_targetLocale: {
              eventTypeId: translation.eventTypeId,
              field: EventTypeAutoTranslatedField.DESCRIPTION,
              targetLocale: translation.targetLocale,
            },
          },
          update: {
            translatedText: translation.translatedText,
            updatedBy: userId,
          },
          create: {
            ...translation,
            field: EventTypeAutoTranslatedField.DESCRIPTION,
            createdBy: userId,
          },
        });
      })
    );
  }
}
