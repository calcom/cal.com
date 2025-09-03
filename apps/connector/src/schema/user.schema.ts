import type { PaginationQuery } from "@/types";
import z from "zod";
import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR, FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import zodToJsonSchema from "zod-to-json-schema";

import type { Prisma } from "@calcom/prisma/client";
import { UserPermissionRole } from "@calcom/prisma/client";

//REQUEST SCHEMAS
// Query schemas
const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  orderBy: z.enum(["id", "email", "name", "role", "createdDate"]).optional(),
  orderDir: z.enum(["asc", "desc"]).default("desc"),
  email: z.string().optional(),
  role: z.nativeEnum(UserPermissionRole).optional(),
  emailVerified: z.coerce.boolean().optional(),
});

// Body schemas
const createUserBodySchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  role: z.nativeEnum(UserPermissionRole),
});

const updateUserBodySchema = createUserBodySchema.partial().extend({
  username: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  hideTeamBranding: z.boolean().optional(),
  trialEndsAt: z.date().optional(),
  allowDynamicBooking: z.boolean().optional().nullable(),
  allowSEOIndexing: z.boolean().optional().nullable(),
  receiveMonthlyDigestEmail: z.boolean().optional().nullable(),
  metadata: z.any().optional(),
  verified: z.boolean().optional().nullable(),
  role: z.nativeEnum(UserPermissionRole).optional(),
  disableImpersonation: z.boolean().optional(),
  locked: z.boolean().optional(),
  smsLockReviewedByAdmin: z.boolean().optional(),
});

export { getUsersQuerySchema, createUserBodySchema, updateUserBodySchema };

export type UserPaginationQuery = PaginationQuery<Prisma.UserOrderByWithRelationInput>;

//RESPONSE SCHEMAS
export const UserResponseSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string().nullable(),
  username: z.string().nullable().optional(),
  role: z.string(),
  organizationId: z.number().nullable().optional(),
  createdAt: z.date().nullable(),
  emailVerified: z.date().nullable(),
});

export const UserResponseJsonSchema = zodToJsonSchema(UserResponseSchema);
export type UserResponse = z.infer<typeof UserResponseSchema>;


export const updateProfileBodySchema = z.object({
  username: z.string().optional(),
  name: z.string().max(FULL_NAME_LENGTH_MAX_LIMIT).optional(),
  email: z.string().email().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  timeZone: timeZoneSchema.optional(),
  weekStart: z.string().optional(),
  hideBranding: z.boolean().optional(),
  allowDynamicBooking: z.boolean().optional(),
  allowSEOIndexing: z.boolean().optional(),
  receiveMonthlyDigestEmail: z.boolean().optional(),
  brandColor: z.string().optional(),
  darkBrandColor: z.string().optional(),
  theme: z.string().optional().nullable(),
  appTheme: z.string().optional().nullable(),
  completedOnboarding: z.boolean().optional(),
  locale: z.string().optional(),
  timeFormat: z.number().optional(),
  disableImpersonation: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
  travelSchedules: z
    .array(
      z.object({
        id: z.number().optional(),
        timeZone: timeZoneSchema,
        endDate: z.string().optional(),
        startDate: z.string(),
      })
    )
    .optional(),
  secondaryEmails: z
    .array(
      z.object({
        id: z.number(),
        email: z.string(),
        isDeleted: z.boolean().default(false),
      })
    )
    .optional(),
});

export const userProfileUpdateResponseSchema = z.object({
  id: z.number(),
  username: z.string().nullable().optional(),
  email: z.string(),
  name: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  hasEmailBeenChanged: z.boolean().optional(),
  sendEmailVerification: z.boolean().optional(),
});

export const userProfileQueryResponse =  z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
  organizationId: z.number().nullable(),
});

export const userProfileSchema = z.object({
  username: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  allowSEOIndexing: z.boolean().optional(),
  brandColor: z.string().optional(),
  darkBrandColor: z.string().optional(),
  theme: z.string().optional().nullable(),
  organizationId: z.string().optional(),
  // ... other fields
});