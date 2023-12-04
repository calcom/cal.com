import { z } from "zod";

export const ZCreateCalendarSyncInputSchema = z.object({
  sourceCredentialId: z.number(),
  sourceExternalId: z.string(),
  toCredentialId: z.number(),
  toExternalId: z.string(),
  color: z.string(),
  privacy: z.enum(["Personal", "Busy", "Partial"]),
  allDayEventConfig: z.enum(["NoAllDay", "Busy", "All"]),
});

export type TCreateCalendarSyncInputSchema = z.infer<typeof ZCreateCalendarSyncInputSchema>;
