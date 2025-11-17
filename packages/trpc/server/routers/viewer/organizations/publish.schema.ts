import { z } from "zod";

export const ZPublishInputSchema = z.object({
  gclid: z.string().optional(),
});

export type TPublishInputSchema = z.infer<typeof ZPublishInputSchema>;
