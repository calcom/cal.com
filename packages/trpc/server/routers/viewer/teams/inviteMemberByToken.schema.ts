import { z } from "zod";

import { CreationSource } from "@calcom/prisma/enums";

export type TInviteMemberByTokenSchemaInputSchema = {
  token: string;
  creationSource: CreationSource;
};

export const ZInviteMemberByTokenSchemaInputSchema = z.object({
  token: z.string(),
  creationSource: z.nativeEnum(CreationSource),
});
