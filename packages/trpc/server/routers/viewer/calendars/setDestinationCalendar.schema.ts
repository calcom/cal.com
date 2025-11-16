import { z } from "zod";

export const ZSetDestinationCalendarInputSchema = z.object({
  integration: z.string(),
  externalId: z.string(),
  eventTypeId: z.number().nullish(),
  bookingId: z.number().nullish(),

  reminderMinutes: z
    .number()
    .int()
    .refine((v) => [0, 5, 10, 15, 30, 60].includes(v), {
      message: "Allowed reminder values: 0,5,10,15,30,60 minutes",
    })
    .optional(),
});

export type TSetDestinationCalendarInputSchema = z.infer<typeof ZSetDestinationCalendarInputSchema>;
