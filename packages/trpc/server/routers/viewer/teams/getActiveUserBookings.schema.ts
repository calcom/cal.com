import { z } from "zod";

export const ZGetActiveUserBookingsInputSchema = z.object({
  teamId: z.number(),
  userId: z.number(),
  email: z.string(),
  activeAs: z.enum(["host", "attendee"]),
});

export type TGetActiveUserBookingsInputSchema = z.infer<typeof ZGetActiveUserBookingsInputSchema>;
