import { WEBAPP_URL } from "@calcom/lib/constants";
import { CreationSource, RedirectType } from "@calcom/prisma/enums";
import { UserSchema } from "@calcom/prisma/zod/modelSchema/UserSchema";
import { authedAdminProcedure } from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export type UserAdminRouter = typeof userAdminRouter;
export type UserAdminRouterOutputs = inferRouterOutputs<UserAdminRouter>;

const userIdSchema = z.object({ userId: z.coerce.number() });

const userBodySchema = UserSchema.pick({
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
  role: true,
  avatarUrl: true,
});

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
    return users;
  }),
  add: authedAdminProcedure.input(userBodySchema).mutation(async ({ ctx, input }) => {
    const { prisma } = ctx;
    try {
      const user = await prisma.user.create({ data: { ...input, creationSource: CreationSource.WEBAPP } });
      return { user, message: "User with id: " + user.id + " added successfully" };
    } catch (error) {
      if ((error as any)?.code === "P2002") {
        const target = (error as any)?.meta?.target as string[] | undefined;
        const field = target?.[0] || "field";
        throw new TRPCError({ code: "CONFLICT", message: "A user with this " + field + " already exists." });
      }
      throw error;
    }
  }),
  delete: authedAdminProcedureWithRequestedUser.input(userIdSchema).mutation(async ({ ctx }) => {
    const { prisma, requestedUser } = ctx;
    await prisma.user.delete({ where: { id: requestedUser.id } });
    return { message: `User with id: ${requestedUser.id} deleted successfully` };
  }),
});
