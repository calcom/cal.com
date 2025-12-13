import { z } from "zod";

import { MembershipRole } from "@calcom/prisma/enums";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TChangeMemberRoleInputSchema = {
  teamId: number;
  memberId: number;
  role: MembershipRole | string;
};

export const ZChangeMemberRoleInputSchema: z.ZodType<TChangeMemberRoleInputSchema> = z.object({
  teamId: z.number(),
  memberId: z.number(),
  role: z.union([z.nativeEnum(MembershipRole), z.string()]), // Support both traditional roles and custom role IDs
});
