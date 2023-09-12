import { z } from "zod";

export const ZPublishInputSchema = z.object({
  teamId: z.coerce.number(),
});

export type TPublishInputSchema = z.infer<typeof ZPublishInputSchema>;
