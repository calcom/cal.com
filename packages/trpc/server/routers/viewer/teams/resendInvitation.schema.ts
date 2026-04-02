import { emailSchema } from "@calcom/lib/emailSchema";
import { z } from "zod";

export type TResendInvitationInputSchemaInput = {
  teamId: number;
  email: string;
  language: string;
  isOrg?: boolean;
};

export type TResendInvitationInputSchema = {
  teamId: number;
  email: string;
  language: string;
  isOrg: boolean;
};

export const ZResendInvitationInputSchema: z.ZodType<
  TResendInvitationInputSchema,
  z.ZodTypeDef,
  TResendInvitationInputSchemaInput
> = z.object({
  teamId: z.number(),
  email: emailSchema,
  language: z.string(),
  isOrg: z.boolean().default(false),
});
