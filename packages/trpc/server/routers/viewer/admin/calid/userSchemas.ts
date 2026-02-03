import { z } from "zod";

import { UserPermissionRole } from "@calcom/prisma/enums";
import { _UserModel as User } from "@calcom/prisma/zod";

export const userIdSchema = z.object({ userId: z.coerce.number() });

export const userBodySchema = User.pick({
  name: true,
  email: true,
  username: true,
  bio: true,
  timeZone: true,
  weekStart: true,
  theme: true,
  defaultScheduleId: true,
  locale: true,
  timeFormat: true,
  allowDynamicBooking: true,
  identityProvider: true,
  role: true,
  avatarUrl: true,
});

export const userUpdateSchema = userBodySchema.partial().extend({
  userId: z.coerce.number(),
});

export const userListSchema = z.object({
  limit: z.number().min(1).max(100),
  offset: z.number().min(0),
  searchTerm: z.string().nullish(),
  role: z.nativeEnum(UserPermissionRole).nullish(),
  locked: z.boolean().nullish(),
  sortBy: z.enum(["name", "email", "createdDate", "role"]).nullish(),
  sortDir: z.enum(["asc", "desc"]).nullish(),
});

export type TUserIdSchema = z.infer<typeof userIdSchema>;
export type TUserBodySchema = z.infer<typeof userBodySchema>;
export type TUserUpdateSchema = z.infer<typeof userUpdateSchema>;
export type TUserListSchema = z.infer<typeof userListSchema>;
