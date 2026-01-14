import { z } from "zod";

export type TUpdateAttendeeDetailsInputSchema = {
  bookingUid: string;
  currentEmail: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  timeZone?: string;
};

export const ZUpdateAttendeeDetailsInputSchema: z.ZodType<TUpdateAttendeeDetailsInputSchema> = z.object({
  bookingUid: z.string(),
  currentEmail: z.string().email(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  timeZone: z.string().optional(),
});
