import { z } from "zod";

export const createCalendarSyncSchema = z.object({
  calendarEventId: z.string(),
  calendarSyncData: z.object({
    userId: z.number(),
    externalCalendarId: z.string(),
    integration: z.string(),
    credentialId: z.number(),
    delegationCredentialId: z.string().nullable(),
    lastSyncedUpAt: z.number(),
    lastSyncDirection: z.enum(["UPSTREAM", "DOWNSTREAM"]),
  }),
});
