import type { Prisma } from "@prisma/client";

import type { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import { prisma } from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

export enum EventTypeAutoTranslatedField {
    DESCRIPTION = "DESCRIPTION",
  }
  
  export type EventTypeTranslation = {
    id: string;
    field: EventTypeAutoTranslatedField;
    sourceLang: string;
    targetLang: string;
    translatedText: string;
    createdAt: Date;
    createdBy: number;
    updatedAt: Date;
    updatedBy: number | null;
    eventTypeId: number;
  };
  
  export type CreateEventTypeTranslation = Omit<
    EventTypeTranslation,
    "id" | "createdAt" | "updatedAt" | "eventType"
  >;
  
  export type UpdateEventTypeTranslation = Partial<
    Omit<EventTypeTranslation, "id" | "createdAt" | "updatedAt" | "eventType">
  >;
  
export class EventTypeTranslationRepository {
  static async create(data:) {
    const eventType = await prisma.eventType.findFirst({
      where: {
        id: eventTypeId,
      },
      select: {
        metadata: true,
      },
    });

    if (!eventType) return null;

    return await prisma.eventTypeTranslation.create({
      eventTypeId: id,
      field: EventTypeAutoTranslatedField.DESCRIPTION,
      sourceLang,
      targetLang: locale,
      translatedText,
      createdBy: ctx.user.id,
    });
  }
}
