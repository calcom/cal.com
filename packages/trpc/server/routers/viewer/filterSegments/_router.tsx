import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCreateFilterSegmentInputSchema } from "./create.schema";
import { ZDeleteFilterSegmentInputSchema } from "./delete.schema";
import { ZListFilterSegmentsInputSchema } from "./list.schema";
import { ZUpdateFilterSegmentInputSchema } from "./update.schema";

type FilterSegmentsRouterHandlerCache = {
  list?: typeof import("./list.handler").listHandler;
  create?: typeof import("./create.handler").createHandler;
  update?: typeof import("./update.handler").updateHandler;
  delete?: typeof import("./delete.handler").deleteHandler;
};

export const filterSegmentsRouter = router({
  list: authedProcedure.input(ZListFilterSegmentsInputSchema).query(async ({ input, ctx }) => {
    const { listHandler } = await import("./list.handler");

    return listHandler({
      ctx,
      input,
    });
  }),

  create: authedProcedure.input(ZCreateFilterSegmentInputSchema).mutation(async ({ input, ctx }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({
      ctx,
      input,
    });
  }),

  update: authedProcedure.input(ZUpdateFilterSegmentInputSchema).mutation(async ({ input, ctx }) => {
    const { updateHandler } = await import("./update.handler");

    return updateHandler({
      ctx,
      input,
    });
  }),

  delete: authedProcedure.input(ZDeleteFilterSegmentInputSchema).mutation(async ({ input, ctx }) => {
    const { deleteHandler } = await import("./delete.handler");

    return deleteHandler({
      ctx,
      input,
    });
  }),
});
