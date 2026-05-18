import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCreateOrganizationInputSchema, ZUpdateOrganizationInputSchema } from "./schema";

export const organizationsRouter = router({
  getCurrent: authedProcedure.query(async ({ ctx }) => {
    const { getCurrentHandler } = await import("./getCurrent.handler");

    return getCurrentHandler({ ctx });
  }),

  create: authedProcedure.input(ZCreateOrganizationInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({ ctx, input });
  }),

  update: authedProcedure.input(ZUpdateOrganizationInputSchema).mutation(async ({ ctx, input }) => {
    const { updateHandler } = await import("./update.handler");

    return updateHandler({ ctx, input });
  }),
});
