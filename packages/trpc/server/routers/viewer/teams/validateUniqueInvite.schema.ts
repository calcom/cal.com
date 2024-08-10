import { z } from "zod";

export const ZValidateUniqueInviteInputSchema = z.object({
  teamId: z.number(),
  value: z.string(),
});

export type TValidateUniqueInviteInputSchema = z.infer<typeof ZValidateUniqueInviteInputSchema>;
