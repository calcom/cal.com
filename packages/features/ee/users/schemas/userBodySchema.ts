import { optionToValueSchema } from "@calcom/prisma/zod-utils";
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
}).extend({
  role: optionToValueSchema(UserSchema.shape.role),
  identityProvider: optionToValueSchema(UserSchema.shape.identityProvider),
  weekStart: optionToValueSchema(UserSchema.shape.weekStart),
  locale: optionToValueSchema(UserSchema.shape.locale),
  timeFormat: optionToValueSchema(UserSchema.shape.timeFormat),
});
