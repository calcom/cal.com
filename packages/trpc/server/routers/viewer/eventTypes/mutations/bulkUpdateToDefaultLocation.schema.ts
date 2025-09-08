import { z } from "zod";

export const ZBulkUpdateToDefaultLocationInputSchema = z.object({
  eventTypeIds: z.array(z.number()),
});

export type TBulkUpdateToDefaultLocationInputSchema = z.infer<typeof ZBulkUpdateToDefaultLocationInputSchema>;
