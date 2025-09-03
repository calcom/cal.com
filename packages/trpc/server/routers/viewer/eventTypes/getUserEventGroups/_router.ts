import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZEventTypeInputSchema } from "../getByViewer.schema";

export const getUserEventGroupsRouter = router({
  get: authedProcedure.input(ZEventTypeInputSchema).query(async ({ ctx, input }) => {
    const { getUserEventGroups } = await import("../getUserEventGroups.handler");

    return getUserEventGroups({
      ctx,
      input,
    });
  }),
});
