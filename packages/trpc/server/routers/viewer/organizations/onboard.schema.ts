import { z } from "zod";

import { orgOnboardingInvitedMembersSchema, orgOnboardingTeamsSchema } from "@calcom/prisma/zod-utils";

export const ZOnboardInputSchema = z.object({
  plan: z.enum(["personal", "team", "organization"]).optional(),
  organization: z.object({
    name: z.string().min(1, "Organization name is required"),
    link: z.string(),
    bio: z.string(),
  }),
  brand: z.object({
    color: z.string(),
    logo: z.string().nullable(),
    banner: z.string().nullable(),
  }),
  teams: orgOnboardingTeamsSchema,
  invites: z.array(
    z.object({
      email: z.string().email(),
      team: z.string(),
      role: z.enum(["member", "admin"]),
    })
  ),
  inviteRole: z.enum(["member", "admin"]),
  onboardingId: z.string(),
});

export type TOnboardInputSchema = z.infer<typeof ZOnboardInputSchema>;
