import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZGetEventTypesFromGroupSchema } from "../getByViewer.schema";

export const getEventTypesFromGroupRouter = router({
  get: authedProcedure.input(ZGetEventTypesFromGroupSchema).query(async ({ ctx, input }) => {
    const { getEventTypesFromGroup } = await import("../getEventTypesFromGroup.handler");

    return getEventTypesFromGroup({
      ctx,
      input,
    });
  }),
});
