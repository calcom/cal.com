import z from "zod";

import { orgOnboardingInvitedMembersSchema, orgOnboardingTeamsSchema } from "@calcom/prisma/zod-utils";

// Base user schema - fields that any user can set
export const createOrganizationSchema = z.object({
  language: z.string().optional(),
  logo: z.string().nullish(),
  bio: z.string().nullish(),
  onboardingId: z.string(),
  invitedMembers: orgOnboardingInvitedMembersSchema.optional(),
  teams: orgOnboardingTeamsSchema.optional(),
});
