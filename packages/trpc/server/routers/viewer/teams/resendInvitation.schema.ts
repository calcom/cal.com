import { emailSchema } from "@calcom/lib/emailSchema";
import { z } from "zod";

export const ZResendInvitationInputSchema = z.object({
  teamId: z.number(),
  email: emailSchema,
  language: z.string(),
  isOrg: z.boolean().default(false),
});

export type TResendInvitationInputSchema = z.infer<typeof ZResendInvitationInputSchema>;
