import { UserSchema } from "@calcom/prisma/zod/modelSchema/UserSchema";

export const userBodySchema = UserSchema.pick({
  username: true,
  name: true,
  email: true,
  role: true,
  identityProvider: true,
  bio: true,
  avatarUrl: true,
  timeZone: true,
  weekStart: true,
  theme: true,
  defaultScheduleId: true,
  locale: true,
  timeFormat: true,
  allowDynamicBooking: true,
});
