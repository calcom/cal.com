import {
  ZCreateFilterSegmentInputSchema,
  ZDeleteFilterSegmentInputSchema,
  ZListFilterSegmentsInputSchema,
  ZSetFilterSegmentPreferenceInputSchema,
  ZUpdateFilterSegmentInputSchema,
} from "@calcom/features/data-table/repositories/filterSegment.type";

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
    const { createFilterSegmentHandler } = await import("./create.handler");

    return createFilterSegmentHandler({
      ctx,
      input,
    });
  }),

  update: authedProcedure.input(ZUpdateFilterSegmentInputSchema).mutation(async ({ input, ctx }) => {
    const { updateFilterSegmentHandler } = await import("./update.handler");

    return updateFilterSegmentHandler({
      ctx,
      input,
    });
  }),

  delete: authedProcedure.input(ZDeleteFilterSegmentInputSchema).mutation(async ({ input, ctx }) => {
    const { deleteFilterSegmentHandler } = await import("./delete.handler");

    return deleteFilterSegmentHandler({
      ctx,
      input,
    });
  }),

  setPreference: authedProcedure
    .input(ZSetFilterSegmentPreferenceInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { setFilterSegmentPreferenceHandler } = await import("./preference.handler");

      return setFilterSegmentPreferenceHandler({
        ctx,
        input,
      });
    }),
});
