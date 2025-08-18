import { logP } from "@calcom/lib/perf";

import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZEventTypeInputSchema } from "../getByViewer.schema";

export const userEventGroupsRouter = router({
  get: authedProcedure.input(ZEventTypeInputSchema).query(async ({ ctx, input }) => {
    const { getUserEventGroups } = await import("../getUserEventGroups.handler");

    const timer = logP(`getUserEventGroups(${ctx.user.id})`);

    const result = await getUserEventGroups({
      ctx,
      input,
    });

    timer();

    return result;
  }),
});
