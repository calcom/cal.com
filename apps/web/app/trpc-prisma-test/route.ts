import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { publicProcedure, router } from "@calcom/trpc/server/trpc";

const testRouter = router({
  getUser: publicProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findFirst({
      where: { id: 1 },
      select: { id: true, name: true },
    });
    return {
      user,
      host: ctx.req?.headers.host || "unknown",
    };
  }),
});

export type TestRouter = typeof testRouter;

export default createNextApiHandler({
  router: testRouter,
});
