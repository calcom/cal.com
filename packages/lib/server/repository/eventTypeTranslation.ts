import { prisma } from "@calcom/prisma";
import type { EventTypeTranslation } from "@calcom/prisma/client";
import { EventTypeAutoTranslatedField } from "@calcom/prisma/enums";

export type CreateEventTypeTranslation = Omit<
  EventTypeTranslation,
  "id" | "createdAt" | "updatedAt" | "updatedBy" | "eventType" | "field"
> & { userId: number };

export type UpdateEventTypeTranslation = Partial<
  Omit<EventTypeTranslation, "id" | "createdAt" | "updatedAt" | "updatedBy" | "eventType">
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
}
