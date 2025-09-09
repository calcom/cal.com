import { z } from "zod";

export const ZCalIdGetInputSchema = z.object({
  id: z.number(),
  calIdTeamId: z.number(),
});

export type TCalIdGetInputSchema = z.infer<typeof ZCalIdGetInputSchema>;
