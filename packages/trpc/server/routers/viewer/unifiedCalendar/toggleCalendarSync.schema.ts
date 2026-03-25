import { z } from "zod";

export const ZToggleCalendarSyncInputSchema = z.object({
  provider: z.enum(["GOOGLE", "OUTLOOK"]),
  credentialId: z.number().int().positive(),
  providerCalendarId: z.string().min(1),
  enabled: z.boolean(),
});

export const ZToggleCalendarSyncOutputSchema = z.object({
  enabled: z.boolean(),
  enqueued: z.boolean(),
});

export type TToggleCalendarSyncInput = z.infer<typeof ZToggleCalendarSyncInputSchema>;
export type TToggleCalendarSyncOutput = z.infer<typeof ZToggleCalendarSyncOutputSchema>;
