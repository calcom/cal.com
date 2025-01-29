import { z } from "zod";

export const ZIsReservedInputSchema = z.object({
  eventTypeId: z.number().int(),
  slotUtcStartDate: z.string(),
  slotUtcEndDate: z.string(),
});

export type TIsReservedInputSchema = z.infer<typeof ZIsReservedInputSchema>;
