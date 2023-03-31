import { z } from "zod";

import { _UserModel as User } from "@calcom/prisma/zod";
import type { inferRouterOutputs } from "@calcom/trpc";
import { TRPCError } from "@calcom/trpc";
import { authedAdminProcedure, middleware, router } from "@calcom/trpc/server/trpc";

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
  // away: true,
  role: true,
  // @note: disallowing avatar changes via API for now. We can add it later if needed. User should upload image via UI.
  // avatar: true,
});

const authedAdminWithUserMiddleware = middleware(async ({ ctx, next, rawInput }) => {
  const { prisma } = ctx;
  const parsed = userIdSchema.safeParse(rawInput);
  if (!parsed.success) throw new TRPCError({ code: "BAD_REQUEST", message: "User id is required" });
  const { userId: id } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  return next({
    ctx: { user: ctx.user, requestedUser: user },
  });
});

const authedAdminProcedureWithRequestedUser = authedAdminProcedure.use(authedAdminWithUserMiddleware);

export const userAdminRouter = router({
  get: authedAdminProcedureWithRequestedUser.input(userIdSchema).query(async ({ ctx }) => {
    const { requestedUser } = ctx;
    return { user: requestedUser };
  }),
  list: authedAdminProcedure.query(async ({ ctx }) => {
    const { prisma } = ctx;
    // TODO: Add search, pagination, etc.
    return prisma.user.findMany();
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
      const user = await prisma.user.update({ where: { id: requestedUser.id }, data: input });
      return { user, message: `User with id: ${user.id} updated successfully` };
    }),
  delete: authedAdminProcedureWithRequestedUser.input(userIdSchema).mutation(async ({ ctx }) => {
    const { prisma, requestedUser } = ctx;
    await prisma.user.delete({ where: { id: requestedUser.id } });
    return { message: `User with id: ${requestedUser.id} deleted successfully` };
  }),
});
