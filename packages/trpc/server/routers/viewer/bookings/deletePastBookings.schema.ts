import { z } from "zod";

export const ZDeletePastBookingsSchema = z.object({
  bookingIds: z.number().array(),
});

export type TDeletePastBookingsSchema = z.infer<typeof ZDeletePastBookingsSchema>;
