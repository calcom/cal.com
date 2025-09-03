import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZEventTypeInputSchema } from "../getByViewer.schema";

export const getByViewerRouter = router({
  get: authedProcedure.input(ZEventTypeInputSchema).query(async ({ ctx, input }) => {
    const { getByViewerHandler } = await import("../getByViewer.handler");

    return getByViewerHandler({
      ctx,
      input,
    });
  }),
});
