import { z } from "zod";

export const ZCalIdGetVerifiedEmailsInputSchema = z.object({
  calIdTeamId: z.number().optional(),
});

export type TCalIdGetVerifiedEmailsInputSchema = z.infer<typeof ZCalIdGetVerifiedEmailsInputSchema>;
