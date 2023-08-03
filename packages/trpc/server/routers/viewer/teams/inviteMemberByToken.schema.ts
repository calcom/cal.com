import { z } from "zod";

export const ZInviteMemberByTokenSchemaInputSchema = z.object({
  token: z.string(),
});

export type TInviteMemberByTokenSchemaInputSchema = z.infer<typeof ZInviteMemberByTokenSchemaInputSchema>;
