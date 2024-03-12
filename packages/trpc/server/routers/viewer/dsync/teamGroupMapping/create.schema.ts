import { z } from "zod";

export const ZCreateInputSchema = z.object({
  name: z.string(),
  teamId: z.number(),
  directoryId: z.string(),
});

export type ZCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
