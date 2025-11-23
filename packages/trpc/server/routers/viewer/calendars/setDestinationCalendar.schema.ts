import { z } from "zod";

export const ZSetDestinationCalendarInputSchema = z.object({
  integration: z.string(),
  externalId: z.string(),
  eventTypeId: z.number().nullish(),
  bookingId: z.number().nullish(),
});

export type TSetDestinationCalendarInputSchema = z.infer<typeof ZSetDestinationCalendarInputSchema>;
