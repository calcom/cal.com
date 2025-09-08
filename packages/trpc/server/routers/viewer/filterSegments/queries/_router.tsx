import { ZListFilterSegmentsInputSchema } from "@calcom/lib/server/repository/filterSegment.type";

import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";

export const filterSegmentsRouter = router({
  list: authedProcedure.input(ZListFilterSegmentsInputSchema).query(async ({ input, ctx }) => {
    const { listHandler } = await import("./list.handler");

    return listHandler({
      ctx,
      input,
    });
  }),
});
