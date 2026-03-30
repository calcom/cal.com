import { z } from "zod";

export type TManagedEventReassignInputSchema = {
  bookingId: number;
};

export const ZManagedEventReassignInputSchema: z.ZodType<TManagedEventReassignInputSchema> = z.object({
  bookingId: z.number().int(),
});
