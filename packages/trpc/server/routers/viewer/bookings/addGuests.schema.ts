import { z } from "zod";

const ZAddAttendee = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  timeZone: z.string().optional(),
  phoneNumber: z.string().optional(),
  language: z.string().optional(),
});

export const ZAddGuestsInputSchema = z.object({
  bookingId: z.number(),
  guests: z.array(ZAddAttendee),
});

export type TAddGuestsInputSchema = z.infer<typeof ZAddGuestsInputSchema>;
