import { z } from "zod";

export const ZIsReservedInputSchema = z.object({
  slots: z.array(
    z.object({
      slotUtcStartDate: z.string(),
      slotUtcEndDate: z.string(),
    })
  ),
  eventTypeId: z.number().int(),
});

export type TIsReservedInputSchema = z.infer<typeof ZIsReservedInputSchema>;
