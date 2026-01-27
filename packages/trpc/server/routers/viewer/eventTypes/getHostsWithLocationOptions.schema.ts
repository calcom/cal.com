import { z } from "zod";

export const ZGetHostsWithLocationOptionsInputSchema = z.object({
  eventTypeId: z.number(),
  cursor: z.number().optional(),
  limit: z.number().min(1).max(100).default(10),
});

export type TGetHostsWithLocationOptionsInputSchema = z.infer<typeof ZGetHostsWithLocationOptionsInputSchema>;
