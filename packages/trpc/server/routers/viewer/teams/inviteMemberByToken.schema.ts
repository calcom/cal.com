import { z } from "zod";

import { CreationSource } from "@calcom/prisma/enums";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TInviteMemberByTokenSchemaInputSchema = {
  token: string;
  creationSource: CreationSource;
};

export const ZInviteMemberByTokenSchemaInputSchema: z.ZodType<TInviteMemberByTokenSchemaInputSchema> = z.object({
  token: z.string(),
  creationSource: z.nativeEnum(CreationSource),
});
