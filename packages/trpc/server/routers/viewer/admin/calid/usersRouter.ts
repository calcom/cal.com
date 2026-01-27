import { WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { CreationSource, RedirectType } from "@calcom/prisma/enums";
import { authedAdminProcedure } from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { userBodySchema, userIdSchema, userUpdateSchema } from "./userSchemas";

const subdomainSuffix = () => {
  const urlSplit = WEBAPP_URL.replace("https://", "").replace("http://", "").split(".");
  return urlSplit.length === 3 ? urlSplit.slice(1).join(".") : urlSplit.join(".");
};

const getOrgFullOrigin = (slug: string | null, options: { protocol: boolean } = { protocol: true }) => {
  if (!slug) {
    return options.protocol ? WEBSITE_URL : WEBSITE_URL.replace("https://", "").replace("http://", "");
  }
  const origin = `${
    options.protocol ? `${new URL(WEBSITE_URL).protocol}//` : ""
  }${slug}.${subdomainSuffix()}`;
  return origin;
};

const authedAdminWithRequestedUser = authedAdminProcedure.use(async ({ ctx, next, getRawInput }) => {
  const parsed = userIdSchema.safeParse(await getRawInput());
  if (!parsed.success) throw new TRPCError({ code: "BAD_REQUEST", message: "User id is required" });
  const user = await ctx.prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  return next({ ctx: { ...ctx, requestedUser: user } });
});

export const calidAdminUsersRouter = router({
  get: authedAdminWithRequestedUser.input(userIdSchema).query(async ({ ctx }) => {
    return { user: ctx.requestedUser };
  }),
  list: authedAdminProcedure.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany();
    return users;
  }),
  add: authedAdminProcedure.input(userBodySchema).mutation(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.create({ data: { ...input, creationSource: CreationSource.WEBAPP } });
    return { user, message: `User with id: ${user.id} added successfully` };
  }),
  update: authedAdminProcedure.input(userUpdateSchema).mutation(async ({ ctx, input }) => {
    const { userId, ...data } = input;

    const user = await ctx.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: userId }, data });

      if (updated.movedToProfileId && data.username) {
        const profile = await tx.profile.update({
          where: { id: updated.movedToProfileId },
          data: { username: data.username },
        });

        if (updated.username && profile.organizationId) {
          const team = await prisma.team.findUnique({
            where: { id: profile.organizationId },
            select: { slug: true },
          });

          if (!team?.slug) throw new Error("Team has no attached slug.");

          const orgUrlPrefix = getOrgFullOrigin(team.slug);
          const toUrl = `${orgUrlPrefix}/${data.username}`;

          await prisma.tempOrgRedirect.updateMany({
            where: { type: RedirectType.User, from: updated.username },
            data: { toUrl },
          });
        }

        return updated;
      }

      if (data.username) {
        await tx.profile.updateMany({
          where: { userId },
          data: { username: data.username },
        });
      }

      return updated;
    });

    return { user, message: `User with id: ${user.id} updated successfully` };
  }),
  delete: authedAdminWithRequestedUser.input(userIdSchema).mutation(async ({ ctx }) => {
    await ctx.prisma.user.delete({ where: { id: ctx.requestedUser.id } });
    return { message: `User with id: ${ctx.requestedUser.id} deleted successfully` };
  }),
});

export type CalidAdminUsersRouter = typeof calidAdminUsersRouter;
