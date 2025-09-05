import type { PaginationQuery } from "@/types";
import z from "zod";
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
