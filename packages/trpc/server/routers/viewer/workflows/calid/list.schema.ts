import { z } from "zod";

export const ZCalIdListInputSchema = z
  .object({
    calIdTeamId: z.number().optional(),
    userId: z.number().optional(),
  })
  .optional();

export type TCalIdListInputSchema = z.infer<typeof ZCalIdListInputSchema>;
