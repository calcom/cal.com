import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";

export type TResendInvitationInputSchema = {
  teamId: number;
  email: string;
  language: string;
  isOrg?: boolean;
};

export const ZResendInvitationInputSchema: z.ZodType<TResendInvitationInputSchema> = z.object({
  teamId: z.number(),
  email: emailSchema,
  language: z.string(),
  isOrg: z.boolean().default(false),
});
