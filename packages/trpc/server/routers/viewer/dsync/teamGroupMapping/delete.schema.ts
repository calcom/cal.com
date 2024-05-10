import { z } from "zod";

export const ZDeleteInputSchema = z.object({
  groupName: z.string(),
  teamId: z.number(),
});

export type ZDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
