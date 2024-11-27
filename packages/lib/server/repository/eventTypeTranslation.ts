import { prisma } from "@calcom/prisma";
import type { EventTypeTranslation } from "@calcom/prisma/client";
import { EventTypeAutoTranslatedField } from "@calcom/prisma/enums";

export type CreateEventTypeDescriptionTranslation = Omit<
  EventTypeTranslation,
  | "id" // TODO: remove after migration
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
  static async upsertManyDescriptionTranslations(translations: Array<CreateEventTypeDescriptionTranslation>) {
    return await Promise.all(
      translations.map(({ userId, ...translation }) => {
        const whereClause = translation.targetLang // TODO: remove after migration
          ? {
              eventTypeId_field_targetLang: {
                eventTypeId: translation.eventTypeId,
                field: EventTypeAutoTranslatedField.DESCRIPTION,
                targetLang: translation.targetLang,
              },
            }
          : {
              eventTypeId_field_targetLocale: {
                eventTypeId: translation.eventTypeId,
                field: EventTypeAutoTranslatedField.DESCRIPTION,
                targetLocale: translation.targetLocale,
              },
            };
        return prisma.eventTypeTranslation.upsert({
          where: whereClause,
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
