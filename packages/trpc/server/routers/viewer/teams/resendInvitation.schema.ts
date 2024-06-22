import { z } from "zod";

import { emailRegex } from "@calcom/prisma/zod-utils";

export const ZResendInvitationInputSchema = z.object({
  teamId: z.number(),
  email: z.string().regex(emailRegex),
  language: z.string(),
  isOrg: z.boolean().default(false),
});

export type TResendInvitationInputSchema = z.infer<typeof ZResendInvitationInputSchema>;
