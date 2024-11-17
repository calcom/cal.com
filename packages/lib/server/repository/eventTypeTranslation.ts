import { prisma } from "@calcom/prisma";
import type { EventTypeTranslation } from "@calcom/prisma/client";
import { EventTypeAutoTranslatedField } from "@calcom/prisma/enums";

export type CreateEventTypeDescriptionTranslation = Omit<
  EventTypeTranslation,
  "id" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "eventType" | "field"
> & { userId: number };

export class EventTypeTranslationRepository {
  static async upsertManyDescriptionTranslations(translations: Array<CreateEventTypeDescriptionTranslation>) {
    return await Promise.all(
      translations.map(({ userId, ...translation }) =>
        prisma.eventTypeTranslation.upsert({
          where: {
            eventTypeId_field_targetLang: {
              eventTypeId: translation.eventTypeId,
              field: EventTypeAutoTranslatedField.DESCRIPTION,
              targetLang: translation.targetLang,
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
        })
      )
    );
  }
}
