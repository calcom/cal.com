import { z } from "zod";

export const ZCalIdCreateInputSchema = z.object({
  calIdTeamId: z.number().optional(),
});

export type TCalIdCreateInputSchema = z.infer<typeof ZCalIdCreateInputSchema>;
