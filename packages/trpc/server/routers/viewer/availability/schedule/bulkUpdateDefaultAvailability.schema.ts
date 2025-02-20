import { z } from "zod";

export const ZBulkUpdateToDefaultAvailabilityInputSchema = z.object({
  eventTypeIds: z.array(z.number()),
  selectedDefaultScheduleId: z.number().nullable().optional(),
});

export type TBulkUpdateToDefaultAvailabilityInputSchema = z.infer<
  typeof ZBulkUpdateToDefaultAvailabilityInputSchema
>;
