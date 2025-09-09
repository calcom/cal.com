import { z } from "zod";

export const ZCalIdGetVerifiedNumbersInputSchema = z.object({
  calIdTeamId: z.number().optional(),
});

export type TCalIdGetVerifiedNumbersInputSchema = z.infer<typeof ZCalIdGetVerifiedNumbersInputSchema>;
