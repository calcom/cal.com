import type { EventTypeTranslation, PrismaClient } from "@calcom/prisma/client";
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
  constructor(private readonly prismaClient: PrismaClient) {}

  async upsertManyTitleTranslations(translations: Array<CreateEventTypeTranslation>) {
    return await Promise.all(
      translations.map(({ userId, ...translation }) => {
        return this.prismaClient.eventTypeTranslation.upsert({
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

  async upsertManyDescriptionTranslations(translations: Array<CreateEventTypeTranslation>) {
    return await Promise.all(
      translations.map(({ userId, ...translation }) => {
        return this.prismaClient.eventTypeTranslation.upsert({
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

  async findByLocale(eventTypeId: number, field: EventTypeAutoTranslatedField, targetLocale: string) {
    return this.prismaClient.eventTypeTranslation.findUnique({
      where: {
        eventTypeId_field_targetLocale: {
          eventTypeId,
          field,
          targetLocale,
        },
      },
    });
  }
}
