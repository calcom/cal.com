import { CreationSource } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZInviteMemberByTokenSchemaInputSchema = z.object({
  token: z.string(),
  creationSource: z.nativeEnum(CreationSource),
});

export type TInviteMemberByTokenSchemaInputSchema = z.infer<typeof ZInviteMemberByTokenSchemaInputSchema>;
