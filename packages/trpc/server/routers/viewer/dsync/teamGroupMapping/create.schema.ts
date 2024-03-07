import { z } from "zod";

export const ZCreateInputSchema = z.object({
  name: z.string(),
  teamId: z.number(),
  directoryId: z.number(),
});

export type ZCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
