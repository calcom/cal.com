import { router } from "../../../../trpc";
import { webhookProcedure } from "../../../util";
import { ZGetInputSchema } from "./get.schema";
import { ZListInputSchema } from "./list.schema";

export const webhookQueriesRouter = router({
  list: webhookProcedure.input(ZListInputSchema).query(async ({ ctx, input }) => {
    const { listHandler } = await import("./list.handler");

    return listHandler({
      ctx,
      input,
    });
  }),

  get: webhookProcedure.input(ZGetInputSchema).query(async ({ ctx, input }) => {
    const { getHandler } = await import("./get.handler");

    return getHandler({
      ctx,
      input,
    });
  }),

  getByViewer: webhookProcedure.query(async ({ ctx }) => {
    const { getByViewerHandler } = await import("./getByViewer.handler");

    return getByViewerHandler({
      ctx,
    });
  }),
});
