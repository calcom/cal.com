import { z } from "zod";

export type TRoutingFormOrderInputSchema = {
  ids: string[];
};

export const ZRoutingFormOrderInputSchema: z.ZodType<TRoutingFormOrderInputSchema> = z.object({
  ids: z.array(z.string()),
});
