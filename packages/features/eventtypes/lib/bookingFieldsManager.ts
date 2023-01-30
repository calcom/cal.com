import { z } from "zod";

import { ensureBookingInputsHaveSystemFields } from "@calcom/lib/getEventTypeById";
import { prisma } from "@calcom/prisma";
import { EventType } from "@calcom/prisma/client";
import { EventTypeMetaDataSchema, customInputSchema, eventTypeBookingFields } from "@calcom/prisma/zod-utils";

type Field = z.infer<typeof eventTypeBookingFields>[number];

async function getEventType(eventTypeId: EventType["id"]) {
  const rawEventType = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    include: {
      customInputs: true,
    },
  });

  if (!rawEventType) {
    throw new Error(`EventType:${eventTypeId} not found`);
  }
  const metadata = EventTypeMetaDataSchema.parse(rawEventType.metadata || {});
  const eventType = {
    ...rawEventType,
    bookingFields: ensureBookingInputsHaveSystemFields({
      bookingFields: eventTypeBookingFields.parse(rawEventType.bookingFields),
      disableGuests: rawEventType.disableGuests,
      additionalNotesRequired: !!metadata?.additionalNotesRequired,
      customInputs: customInputSchema.array().parse(rawEventType.customInputs || []),
    }),
  };
  return eventType;
}

/**
 *
 * @param fieldToAdd Field to add
 * @param source Source of the field to be shown in UI
 * @param eventTypeId
 */
export async function addBookingField(
  fieldToAdd: Field,
  source: NonNullable<Field["sources"]>[number],
  eventTypeId: EventType["id"]
) {
  const eventType = await getEventType(eventTypeId);
  let fieldFound = false;
  const newFields = eventType.bookingFields.map((f) => {
    if (f.name === fieldToAdd.name) {
      fieldFound = true;

      const currentSources = f.sources ? f.sources : ([] as NonNullable<typeof f.sources>[]);
      if (currentSources.find((s) => s.id === source.id)) {
        // No need to add the source
        return f;
      }
      const newField = {
        ...f,
        sources: [...currentSources, source],
      };
      return newField;
    }
    return f;
  });
  if (!fieldFound) {
    newFields.push({
      ...fieldToAdd,
      sources: [source],
    });
  }
  await prisma.eventType.update({
    where: {
      id: eventTypeId,
    },
    data: {
      bookingFields: newFields,
    },
  });
}

export async function removeBookingField(
  fieldToRemove: Pick<Field, "name">,
  source: Pick<NonNullable<Field["sources"]>[number], "id" | "type">,
  eventTypeId: EventType["id"]
) {
  const eventType = await getEventType(eventTypeId);

  const newFields = eventType.bookingFields
    .map((f) => {
      if (f.name === fieldToRemove.name) {
        const currentSources = f.sources ? f.sources : ([] as NonNullable<typeof f.sources>[]);
        if (!currentSources.find((s) => s.id === source.id)) {
          // No need to remove the source
          return f;
        }
        const newField = {
          ...f,
          sources: currentSources.filter((s) => s.id !== source.id),
        };
        if (newField.sources.length === 0) {
          return null;
        }
        return newField;
      }
      return f;
    })
    .filter((f): f is Field => !!f);

  await prisma.eventType.update({
    where: {
      id: eventTypeId,
    },
    data: {
      bookingFields: newFields,
    },
  });
}
