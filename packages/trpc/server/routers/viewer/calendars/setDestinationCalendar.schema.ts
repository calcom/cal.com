import { z } from "zod";

export type TSetDestinationCalendarInputSchema = {
  integration: string;
  externalId: string;
  eventTypeId?: number | null;
  bookingId?: number | null;
};

export const ZSetDestinationCalendarInputSchema: z.ZodType<TSetDestinationCalendarInputSchema> = z.object({
  integration: z.string(),
  externalId: z.string(),
  eventTypeId: z.number().nullish(),
  bookingId: z.number().nullish(),
});
