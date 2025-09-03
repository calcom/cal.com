import { z } from "zod";

export const ZPublishInputSchema = z.object({
  teamId: z.number(),
});

export type TPublishInputSchema = z.infer<typeof ZPublishInputSchema>;
