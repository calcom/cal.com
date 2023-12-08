import { z } from "zod";

export const ZBookingForwardingInputSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  toTeamUserId: z.number().nullable(),
});

export type TBookingForwardingInputSchema = z.infer<typeof ZBookingForwardingInputSchema>;

export const ZBookingForwardingConfirm = z.object({
  bookingForwardingUid: z.string(),
});

export type TBookingForwardingConfirm = z.infer<typeof ZBookingForwardingConfirm>;

export const ZBookingForwardingDelete = z.object({
  bookingForwardingUid: z.string(),
});

export type TBookingForwardingDelete = z.infer<typeof ZBookingForwardingDelete>;
