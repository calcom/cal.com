import { z } from "zod";

export const ZListWithTeamInputSchema = z.object({
  take: z.number().min(1).max(100).default(50).optional(),
  skip: z.number().min(0).default(0).optional(),
});

export type TListWithTeamInputSchema = z.infer<typeof ZListWithTeamInputSchema>;
