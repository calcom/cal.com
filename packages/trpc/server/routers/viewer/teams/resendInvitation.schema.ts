import { z } from "zod";

export const ZResendInvitationInputSchema = z.object({
  teamId: z.number(),
  email: z.string().email(),
  language: z.string(),
  isOrg: z.boolean().default(false),
});

export type TResendInvitationInputSchema = z.infer<typeof ZResendInvitationInputSchema>;
