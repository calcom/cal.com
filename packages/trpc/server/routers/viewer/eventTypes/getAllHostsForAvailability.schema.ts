import { z } from "zod";

export const ZGetAllHostsForAvailabilityInputSchema = z.object({
  eventTypeId: z.number(),
});

export type TGetAllHostsForAvailabilityInputSchema = z.infer<typeof ZGetAllHostsForAvailabilityInputSchema>;
