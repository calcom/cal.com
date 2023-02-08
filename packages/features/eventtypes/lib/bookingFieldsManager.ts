import { z } from "zod";

import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { prisma } from "@calcom/prisma";
import { EventType } from "@calcom/prisma/client";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import { Optional } from "@calcom/types/utils";

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

  const eventType = {
    ...rawEventType,
    bookingFields: getBookingFieldsWithSystemFields(rawEventType),
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
  fieldToAdd: Omit<Field, "required">,
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
        // No need to add the source - It's already there
        return f;
      }
      const newSources = [...currentSources, source];
      const newField = {
        ...f,
        // If any source requires the field, mark the field required
        required: newSources.some((s) => s.fieldRequired),
        sources: newSources,
      };
      return newField;
    }
    return f;
  });
  if (!fieldFound) {
    newFields.push({
      ...fieldToAdd,
      required: source.fieldRequired,
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
          // No need to remove the source - It doesn't exist already
          return f;
        }
        const newSources = currentSources.filter((s) => s.id !== source.id);
        const newField = {
          ...f,
          required: newSources.some((s) => s.fieldRequired),
          sources: newSources,
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

export async function updateBookingField(
  fieldToUpdate: Pick<Field, "name">,
  source: Omit<Optional<NonNullable<Field["sources"]>[number], "label" | "fieldRequired">, "type">,
  eventTypeId: EventType["id"]
) {
  const eventType = await getEventType(eventTypeId);
  const newFields = eventType.bookingFields.map((f) => {
    if (f.name === fieldToUpdate.name) {
      const currentSources = f.sources ? f.sources : ([] as NonNullable<typeof f.sources>[]);
      if (!currentSources.find((s) => s.id === source.id)) {
        // Nothing to update
        return f;
      }

      const newSources = currentSources.map((s) => {
        if (s.id !== source.id) {
          // If the source is not found, nothing to update
          return s;
        }

        console.log("Updating with", source);
        return {
          ...s,
          ...source,
        };
      });

      const newField = {
        ...f,
        required: newSources.some((s) => s.fieldRequired),
        sources: newSources,
      };

      return newField;
    }
    return f;
  });

  await prisma.eventType.update({
    where: {
      id: eventTypeId,
    },
    data: {
      bookingFields: newFields,
    },
  });
}
