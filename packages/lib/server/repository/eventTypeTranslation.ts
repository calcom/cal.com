import { prisma } from "@calcom/prisma";
import type { EventTypeTranslation } from "@calcom/prisma/client";
import { EventTypeAutoTranslatedField } from "@calcom/prisma/enums";

export type CreateEventTypeTranslation = Omit<
  EventTypeTranslation,
  "id" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "eventType" | "field"
> & { userId: number };

export type UpdateEventTypeTranslation = Partial<
  Omit<EventTypeTranslation, "id" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "eventType">
>;

export class EventTypeTranslationRepository {
  static async createDescriptionTranslation(data: CreateEventTypeTranslation) {
    const { userId, ...rest } = data;
    return await prisma.eventTypeTranslation.create({
      data: {
        ...rest,
        field: EventTypeAutoTranslatedField.DESCRIPTION,
        createdBy: userId,
      },
    });
  }

  static async upsertManyDescriptionTranslations(translations: Array<CreateEventTypeTranslation>) {
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
