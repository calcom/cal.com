import { z } from "zod";

export const ZCalIdCalendarOverlayInputSchema = z.object({
  loggedInUsersTz: z.string(),
  dateFrom: z.string().nullable(),
  dateTo: z.string().nullable(),
  calendarsToLoad: z.array(
    z.object({
      credentialId: z.number(),
      externalId: z.string(),
    })
  ),
});

export type TCalIdCalendarOverlayInputSchema = z.infer<typeof ZCalIdCalendarOverlayInputSchema>;
