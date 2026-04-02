import { CreationSource } from "@calcom/prisma/enums";
import { z } from "zod";

export type TInviteMemberByTokenSchemaInputSchema = {
  token: string;
  creationSource: CreationSource;
};

export const ZInviteMemberByTokenSchemaInputSchema: z.ZodType<TInviteMemberByTokenSchemaInputSchema> =
  z.object({
    token: z.string(),
    creationSource: z.nativeEnum(CreationSource),
  });
