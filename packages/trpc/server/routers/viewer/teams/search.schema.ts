import { z } from "zod";

export const ZSearchInputSchema = z.object({
  search: z.string().optional(),
  limit: z.number().min(1).max(100).nullish(),
  cursor: z
    .object({
      teamId: z.number(),
      userId: z.number(),
    })
    .nullish(),
  teamId: z.number(),
});

export type TSearchInputSchema = z.infer<typeof ZSearchInputSchema>;
