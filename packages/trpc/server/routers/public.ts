import { t, publicProcedure } from "../trpc";

export const publicRouter = t.router({
  session: publicProcedure.query(({ ctx }) => ctx.session),
});
