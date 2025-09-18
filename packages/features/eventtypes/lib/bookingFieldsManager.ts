import type { z } from "zod";

import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { workflowSelect } from "@calcom/features/ee/workflows/lib/getAllWorkflows";
import { prisma } from "@calcom/prisma";
import type { EventType } from "@calcom/prisma/client";
import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

type Field = z.infer<typeof eventTypeBookingFields>[number];

async function getEventType(eventTypeId: EventType["id"]) {
  const rawEventType = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    include: {
      customInputs: true,
      profile: {
        select: {
          organizationId: true,
        },
      },
      workflows: {
        select: {
          workflow: {
            select: workflowSelect,
          },
        },
      },
    },
  });

  if (!rawEventType) {
    throw new Error(`EventType:${eventTypeId} not found`);
  }

  const { profile, ...restEventType } = rawEventType;

  const isOrgTeamEvent = !!rawEventType?.teamId && !!profile?.organizationId;

  const eventType = {
    ...restEventType,
    bookingFields: getBookingFieldsWithSystemFields({ ...restEventType, isOrgTeamEvent }),
  };
  return eventType;
}

/**
 *
 * @param fieldToAdd Field to add
 * @param source Source of the field to be shown in UI
 * @param eventTypeId
 */
export async function upsertBookingField(
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
      let sourceFound = false;
      let newSources = currentSources.map((s) => {
        if (s.id !== source.id) {
          // If the source is not found, nothing to update
          return s;
        }
        sourceFound = true;

        return {
          ...s,
          ...source,
        };
      });

      if (!sourceFound) {
        newSources = [...newSources, source];
      }
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
