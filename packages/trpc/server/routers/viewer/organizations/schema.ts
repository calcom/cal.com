import { MembershipRole } from "@calcom/prisma/enums";
import { z } from "zod";

const slugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens.");

export const ZCreateOrganizationInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  bio: z.string().trim().max(500).optional().nullable(),
});

export const ZUpdateOrganizationInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  bio: z.string().trim().max(500).optional().nullable(),
});

export const ZListMembersInputSchema = z.object({
  search: z.string().optional(),
  cursor: z.number().optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const ZInviteMemberInputSchema = z.object({
  email: z.string().email(),
  role: z.enum([MembershipRole.MEMBER, MembershipRole.ADMIN]).optional(),
});

export const ZRemoveMemberInputSchema = z.object({
  userId: z.number(),
});

export const ZUpdateMemberRoleInputSchema = z.object({
  userId: z.number(),
  role: z.enum([MembershipRole.MEMBER, MembershipRole.ADMIN]),
});

export const ZAcceptDeclineInviteInputSchema = z.object({
  teamId: z.number(),
});

export type TCreateOrganizationInputSchema = z.infer<typeof ZCreateOrganizationInputSchema>;
export type TUpdateOrganizationInputSchema = z.infer<typeof ZUpdateOrganizationInputSchema>;
export type TListMembersInputSchema = z.infer<typeof ZListMembersInputSchema>;
export type TInviteMemberInputSchema = z.infer<typeof ZInviteMemberInputSchema>;
export type TRemoveMemberInputSchema = z.infer<typeof ZRemoveMemberInputSchema>;
export type TUpdateMemberRoleInputSchema = z.infer<typeof ZUpdateMemberRoleInputSchema>;
export type TAcceptDeclineInviteInputSchema = z.infer<typeof ZAcceptDeclineInviteInputSchema>;
