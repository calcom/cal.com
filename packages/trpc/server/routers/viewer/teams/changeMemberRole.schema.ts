import { MembershipRole } from "@calcom/prisma/enums";
import { z } from "zod";

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
