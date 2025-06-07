import {
  ZCreateFilterSegmentInputSchema,
  ZDeleteFilterSegmentInputSchema,
  ZListFilterSegmentsInputSchema,
  ZSetFilterSegmentPreferenceInputSchema,
  ZUpdateFilterSegmentInputSchema,
} from "@calcom/lib/server/repository/filterSegment.type";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

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

  setPreference: authedProcedure
    .input(ZSetFilterSegmentPreferenceInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { setPreferenceHandler } = await import("./preference.handler");

      return setPreferenceHandler({
        ctx,
        input,
      });
    }),
});
