import { z } from "zod";

export const ZCalIdRoutingFormOrderInputSchema = z.object({
  ids: z.array(z.string()),
});

export type TCalIdRoutingFormOrderInputSchema = z.infer<typeof ZCalIdRoutingFormOrderInputSchema>;
