import type { PaginationQuery } from "@/types";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import type { Prisma } from "@calcom/prisma/client";
import { CalIdMembershipRole } from "@calcom/prisma/client";

// REQUEST SCHEMAS
// Query schemas
export const getTeamsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  orderBy: z.enum(["id", "name", "slug", "createdAt"]).optional(),
  orderDir: z.enum(["asc", "desc"]).default("desc"),
  name: z.string().optional(),
  slug: z.string().optional(),
  isTeamPrivate: z.coerce.boolean().optional(),
});

export const getTeamMembershipsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  orderBy: z.enum(["id", "role", "acceptedInvitation", "createdAt"]).optional(),
  orderDir: z.enum(["asc", "desc"]).default("desc"),
  role: z.nativeEnum(CalIdMembershipRole).optional(),
  acceptedInvitation: z.coerce.boolean().optional(),
});

// Body schemas
export const createTeamBodySchema = z.object({
  name: z.string().min(1, "Team name is required").max(255, "Team name too long"),
  slug: z.string().min(1, "Slug is required").max(100, "Slug too long").optional(),
  bio: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  hideTeamBranding: z.boolean().default(false),
  hideTeamProfileLink: z.boolean().default(false),
  isTeamPrivate: z.boolean().default(false),
  hideBookATeamMember: z.boolean().default(false),
  theme: z.string().optional().nullable(),
  brandColor: z.string().optional().nullable(),
  darkBrandColor: z.string().optional().nullable(),
  timeFormat: z.number().int().min(12).max(24).optional().nullable(),
  timeZone: z.string().default("Asia/Kolkata"),
  weekStart: z.string().default("Monday"),
  metadata: z.any().optional().nullable(),
  bookingFrequency: z.any().optional().nullable(),
});

export const updateTeamBodySchema = createTeamBodySchema.partial();

export const createTeamMembershipBodySchema = z.object({
  userId: z.number().int().positive("User ID is required"),
  role: z.nativeEnum(CalIdMembershipRole).default(CalIdMembershipRole.MEMBER),
  acceptedInvitation: z.boolean().default(false),
  impersonation: z.boolean().default(true),
});

export const updateTeamMembershipBodySchema = z.object({
  role: z.nativeEnum(CalIdMembershipRole).optional(),
  acceptedInvitation: z.boolean().optional(),
  impersonation: z.boolean().optional(),
});

// RESPONSE SCHEMAS
export const TeamResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string().nullable(),
  bio: z.string().nullable(),
  logoUrl: z.string().nullable(),
  hideTeamBranding: z.boolean(),
  hideTeamProfileLink: z.boolean(),
  isTeamPrivate: z.boolean(),
  hideBookATeamMember: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.any().nullable(),
  theme: z.string().nullable(),
  brandColor: z.string().nullable(),
  darkBrandColor: z.string().nullable(),
  timeFormat: z.number().nullable(),
  timeZone: z.string(),
  weekStart: z.string(),
  bookingFrequency: z.any().nullable(),
  memberCount: z.number().optional(),
  eventTypeCount: z.number().optional(),
});

export const MembershipResponseSchema = z.object({
  id: z.number(),
  teamId: z.number(),
  userId: z.number(),
  acceptedInvitation: z.boolean(),
  role: z.nativeEnum(CalIdMembershipRole),
  impersonation: z.boolean(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  user: z
    .object({
      id: z.number(),
      name: z.string().nullable(),
      email: z.string(),
      username: z.string().nullable(),
      avatarUrl: z.string().nullable(),
      timeZone: z.string(),
    })
    .optional(),
  team: z
    .object({
      id: z.number(),
      name: z.string(),
      slug: z.string().nullable(),
    })
    .optional(),
});

export const TeamScheduleResponseSchema = z.object({
  userId: z.number(),
  userName: z.string().nullable(),
  userEmail: z.string(),
  schedules: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      timeZone: z.string(),
      isDefault: z.boolean(),
      availability: z.any().nullable(),
    })
  ),
});

export const TeamResponseJsonSchema = zodToJsonSchema(TeamResponseSchema);
export const MembershipResponseJsonSchema = zodToJsonSchema(MembershipResponseSchema);

export type TeamResponse = z.infer<typeof TeamResponseSchema>;
export type MembershipResponse = z.infer<typeof MembershipResponseSchema>;
export type TeamScheduleResponse = z.infer<typeof TeamScheduleResponseSchema>;

export type TeamPaginationQuery = PaginationQuery<Prisma.CalIdTeamOrderByWithRelationInput>;
export type MembershipPaginationQuery = PaginationQuery<Prisma.CalIdMembershipOrderByWithRelationInput>;
