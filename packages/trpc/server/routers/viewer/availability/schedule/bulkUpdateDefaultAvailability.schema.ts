import { z } from "zod";

export const ZBulkUpdateToDefaultAvailabilityInputSchema = z.object({
  eventTypeIds: z.array(z.number()),
});

export type TBulkUpdateToDefaultAvailabilityInputSchema = z.infer<
  typeof ZBulkUpdateToDefaultAvailabilityInputSchema
>;
