import { z } from "zod";

export const ZGetHostsWithLocationOptionsInputSchema = z.object({
  eventTypeId: z.number(),
});

export type TGetHostsWithLocationOptionsInputSchema = z.infer<typeof ZGetHostsWithLocationOptionsInputSchema>;
