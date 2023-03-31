import { z } from "zod";

import { _UserModel as User } from "@calcom/prisma/zod";
import { TRPCError } from "@calcom/trpc";
import { authedAdminProcedure, router } from "@calcom/trpc/server/trpc";

export const userAdminRouter = router({
  list: authedAdminProcedure.query(async ({ ctx }) => {
    const { prisma } = ctx;
    return prisma.user.findMany();
  }),
  add: authedAdminProcedure
    .input(
      User.pick({
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx;
      const user = await prisma.user.create({ data: input });
      return { user, message: `User with id: ${user.id} deleted successfully` };
    }),
  delete: authedAdminProcedure
    .input(z.object({ userId: z.coerce.number() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx;
      const { userId: id } = input;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      await prisma.user.delete({ where: { id } });
      return { message: `User with id: ${user.id} deleted successfully` };
    }),
});
