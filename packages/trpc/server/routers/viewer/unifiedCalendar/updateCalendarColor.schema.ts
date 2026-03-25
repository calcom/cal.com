import { z } from "zod";

export const ZUpdateCalendarColorInputSchema = z.object({
  provider: z.enum(["GOOGLE", "OUTLOOK"]),
  credentialId: z.number().int().positive(),
  providerCalendarId: z.string().min(1),
  color: z.string().min(1).max(64),
});

export const ZUpdateCalendarColorOutputSchema = z.object({
  color: z.string().min(1).max(64),
});

export type TUpdateCalendarColorInput = z.infer<typeof ZUpdateCalendarColorInputSchema>;
export type TUpdateCalendarColorOutput = z.infer<typeof ZUpdateCalendarColorOutputSchema>;
