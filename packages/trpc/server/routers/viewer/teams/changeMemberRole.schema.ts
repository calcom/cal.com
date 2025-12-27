import { z } from "zod";

import { MembershipRole } from "@calcom/prisma/enums";

// In zod v4, using z.ZodType<T> annotation breaks input type inference for tRPC mutations.
// Use satisfies instead to preserve type inference while checking compatibility.
export const ZChangeMemberRoleInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  role: z.union([z.nativeEnum(MembershipRole), z.string()]), // Support both traditional roles and custom role IDs
}) satisfies z.ZodType<{
  teamId: number;
  memberId: number;
  role: MembershipRole | string;
}>;

export type TChangeMemberRoleInputSchema = z.infer<typeof ZChangeMemberRoleInputSchema>;
