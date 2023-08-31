import { z } from "zod";

export const ZRoutingFormOrderInputSchema = z.object({
  ids: z.array(z.string()),
});

export type TRoutingFormOrderInputSchema = z.infer<typeof ZRoutingFormOrderInputSchema>;
