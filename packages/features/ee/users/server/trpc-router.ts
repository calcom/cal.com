import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { AVATAR_FALLBACK } from "@calcom/lib/constants";
import { _UserModel as User } from "@calcom/prisma/zod";
import type { inferRouterOutputs } from "@calcom/trpc";
import { TRPCError } from "@calcom/trpc";
import { authedAdminProcedure } from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

export type UserAdminRouter = typeof userAdminRouter;
export type UserAdminRouterOutputs = inferRouterOutputs<UserAdminRouter>;

const userIdSchema = z.object({ userId: z.coerce.number() });

const userBodySchema = User.pick({
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
  // brandColor: true,
  // darkBrandColor: true,
  allowDynamicBooking: true,
  identityProvider: true,
  // away: true,
  role: true,
  avatar: true,
});

/**
 * @deprecated in favour of @calcom/lib/getAvatarUrl
 */
/** This helps to prevent reaching the 4MB payload limit by avoiding base64 and instead passing the avatar url */
export function getAvatarUrlFromUser(user: {
  avatar: string | null;
  username: string | null;
  email: string;
}) {
  if (!user.avatar || !user.username) return AVATAR_FALLBACK;
  return `${WEBAPP_URL}/${user.username}/avatar.png`;
}

/** @see https://www.prisma.io/docs/concepts/components/prisma-client/excluding-fields#excluding-the-password-field */
function exclude<UserType, Key extends keyof UserType>(user: UserType, keys: Key[]): Omit<UserType, Key> {
  for (const key of keys) {
    delete user[key];
  }
  return user;
}

/** Reusable logic that checks for admin permissions and if the requested user exists */
//const authedAdminWithUserMiddleware = middleware();

const authedAdminProcedureWithRequestedUser = authedAdminProcedure.use(async ({ ctx, next, getRawInput }) => {
  const { prisma } = ctx;
  const parsed = userIdSchema.safeParse(await getRawInput());
  if (!parsed.success) throw new TRPCError({ code: "BAD_REQUEST", message: "User id is required" });
  const { userId: id } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  return next({
    ctx: {
      user: ctx.user,
      requestedUser: user,
    },
  });
});

export const userAdminRouter = router({
  get: authedAdminProcedureWithRequestedUser.input(userIdSchema).query(async ({ ctx }) => {
    const { requestedUser } = ctx;
    return { user: requestedUser };
  }),
  list: authedAdminProcedure.query(async ({ ctx }) => {
    const { prisma } = ctx;
    // TODO: Add search, pagination, etc.
    const users = await prisma.user.findMany();
    return users.map((user) => ({
      ...user,
      /**
       * FIXME: This should be either a prisma extension or middleware
       * @see https://www.prisma.io/docs/concepts/components/prisma-client/middleware
       * @see https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions/result
       **/
      avatar: getAvatarUrlFromUser(user),
    }));
  }),
  add: authedAdminProcedure.input(userBodySchema).mutation(async ({ ctx, input }) => {
    const { prisma } = ctx;
    const user = await prisma.user.create({ data: input });
    return { user, message: `User with id: ${user.id} added successfully` };
  }),
  update: authedAdminProcedureWithRequestedUser
    .input(userBodySchema.partial())
    .mutation(async ({ ctx, input }) => {
      const { prisma, requestedUser } = ctx;

      const user = await prisma.$transaction(async (tx) => {
        const userInternal = await tx.user.update({ where: { id: requestedUser.id }, data: input });

        // If the profile has been moved to an Org -> we can easily access the profile we need to update
        if (requestedUser.movedToProfileId && input.username) {
          await tx.profile.update({
            where: {
              id: requestedUser.movedToProfileId,
            },
            data: {
              username: input.username,
            },
          });

          return userInternal;
        }

        /**
         * TODO (Sean/Hariom): Change this to profile specific when we have a way for a user to have > 1 orgs
         * If the user wasnt a CAL account before being moved to an org they dont have the movedToProfileId value
         * So we update all of their profiles to this new username - this tx will rollback if there is a username
         * conflict here somehow (Note for now users only have ONE profile.)
         **/
        if (input.username) {
          await tx.profile.updateMany({
            where: {
              userId: requestedUser.id,
            },
            data: {
              username: input.username,
            },
          });
        }

        return userInternal;
      });
      return { user, message: `User with id: ${user.id} updated successfully` };
    }),
  delete: authedAdminProcedureWithRequestedUser.input(userIdSchema).mutation(async ({ ctx }) => {
    const { prisma, requestedUser } = ctx;
    await prisma.user.delete({ where: { id: requestedUser.id } });
    return { message: `User with id: ${requestedUser.id} deleted successfully` };
  }),
});
