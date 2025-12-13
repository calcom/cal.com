import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";

// Input type - what callers send (isOrg is optional)
export type TResendInvitationInputSchemaInput = {
  teamId: number;
  email: string;
  language: string;
  isOrg?: boolean;
};

// Output type - what handlers receive after parsing (isOrg has default, so required)
export type TResendInvitationInputSchema = {
  teamId: number;
  email: string;
  language: string;
  isOrg: boolean;
};

export const ZResendInvitationInputSchema: z.ZodType<TResendInvitationInputSchema, z.ZodTypeDef, TResendInvitationInputSchemaInput> = z.object({
  teamId: z.number(),
  email: emailSchema,
  language: z.string(),
  isOrg: z.boolean().default(false),
});
