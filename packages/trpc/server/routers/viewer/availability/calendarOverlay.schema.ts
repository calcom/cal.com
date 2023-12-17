import { z } from "zod";

export const ZCalendarOverlayInputSchema = z.object({
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

export type TCalendarOverlayInputSchema = z.infer<typeof ZCalendarOverlayInputSchema>;
