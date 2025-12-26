import { z } from "zod";

export type TManagedEventReassignInputSchema = {
  bookingId: number;
};

export const ZManagedEventReassignInputSchema = z.object({
  bookingId: z.number().int(),
});

