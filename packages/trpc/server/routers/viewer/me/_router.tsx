import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZDeleteMeInputSchema } from "./deleteMe.schema";
import { get } from "./procedures/get";

export const meRouter = router({
  get,
  myStats: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("./myStats.handler")).myStatsHandler;

    return handler({ ctx });
  }),
  platformMe: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("./platformMe.handler")).platformMeHandler;

    return handler({ ctx });
  }),
  deleteMe: authedProcedure.input(ZDeleteMeInputSchema).mutation(async ({ ctx, input }) => {
    return await import("./deleteMe.handler").deleteMeHandler.deleteMe({ ctx, input });
  }),
  deleteMeWithoutPassword: authedProcedure.mutation(async ({ ctx }) => {
    return await import(
      "./deleteMeWithoutPassword.handler"
    ).deleteMeWithoutPasswordHandler.deleteMeWithoutPassword({ ctx });
  }),
});
