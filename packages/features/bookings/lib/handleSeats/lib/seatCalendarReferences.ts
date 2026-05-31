import type { Prisma } from "@calcom/prisma/client";
import type { PartialReference } from "@calcom/types/EventManager";
import { z } from "zod";

export const OFFICE365_CALENDAR_TYPE = "office365_calendar";

const SEAT_CALENDAR_REFERENCES_KEY = "calcomSeatCalendarReferences";

const seatCalendarReferenceSchema = z.object({
  type: z.string(),
  uid: z.string(),
  meetingId: z.string().nullable().optional(),
  thirdPartyRecurringEventId: z.string().nullable().optional(),
  meetingPassword: z.string().nullable().optional(),
  meetingUrl: z.string().nullable().optional(),
  externalCalendarId: z.string().nullable().optional(),
  credentialId: z.number().nullable().optional(),
  delegationCredentialId: z.string().nullable().optional(),
});

const seatCalendarReferencesMetadataSchema = z
  .object({
    [SEAT_CALENDAR_REFERENCES_KEY]: z.record(z.string(), z.array(seatCalendarReferenceSchema)).optional(),
  })
  .passthrough();

const toMetadataObject = (
  metadata: Prisma.JsonValue | Prisma.InputJsonValue | Record<string, string> | null | undefined
): Prisma.InputJsonObject => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return Object.entries(metadata).reduce<Record<string, Prisma.InputJsonValue>>((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value as Prisma.InputJsonValue;
    }
    return acc;
  }, {});
};

const toStorableSeatReference = (reference: PartialReference) => ({
  type: reference.type,
  uid: reference.uid,
  meetingId: reference.meetingId ?? null,
  thirdPartyRecurringEventId: reference.thirdPartyRecurringEventId ?? null,
  meetingPassword: reference.meetingPassword ?? null,
  meetingUrl: reference.meetingUrl ?? null,
  externalCalendarId: reference.externalCalendarId ?? null,
  credentialId: reference.credentialId ?? null,
  delegationCredentialId: reference.delegationCredentialId ?? null,
});

export const withSeatCalendarReferences = ({
  metadata,
  integration,
  references,
}: {
  metadata: Prisma.JsonValue | Prisma.InputJsonValue | Record<string, string> | null | undefined;
  integration: string;
  references: PartialReference[];
}): Prisma.InputJsonObject => {
  const metadataObject = toMetadataObject(metadata);
  const parsedMetadata = seatCalendarReferencesMetadataSchema.safeParse(metadataObject);
  const referencesByIntegration = parsedMetadata.success
    ? { ...(parsedMetadata.data[SEAT_CALENDAR_REFERENCES_KEY] ?? {}) }
    : {};

  return {
    ...metadataObject,
    [SEAT_CALENDAR_REFERENCES_KEY]: {
      ...referencesByIntegration,
      [integration]: references.map(toStorableSeatReference),
    },
  };
};

export const getSeatCalendarReferences = (
  metadata: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  integration: string
): PartialReference[] => {
  const parsedMetadata = seatCalendarReferencesMetadataSchema.safeParse(toMetadataObject(metadata));
  if (!parsedMetadata.success) {
    return [];
  }

  return parsedMetadata.data[SEAT_CALENDAR_REFERENCES_KEY]?.[integration] ?? [];
};
