import { z } from "zod";

import { logP } from "@calcom/lib/perf";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { bulkEventFetchHandler } from "./bulkEventFetch.handler";
import { bulkUpdateToDefaultLocationHandler } from "./bulkUpdateToDefaultLocation.handler";
import { createHandler } from "./create.handler";
import { ZCreateInputSchema } from "./create.schema";
import { deleteHandler } from "./delete.handler";
import { ZDeleteInputSchema } from "./delete.schema";
import { duplicateHandler } from "./duplicate.handler";
import { ZDuplicateInputSchema } from "./duplicate.schema";
// Direct imports of all handlers
import { getByViewerHandler } from "./getByViewer.handler";
import { ZEventTypeInputSchema, ZGetEventTypesFromGroupSchema } from "./getByViewer.schema";
import { getEventTypesFromGroup } from "./getEventTypesFromGroup.handler";
import { getTeamAndEventTypeOptions } from "./getTeamAndEventTypeOptions.handler";
import { ZGetTeamAndEventTypeOptionsSchema } from "./getTeamAndEventTypeOptions.schema";
import { getUserEventGroups } from "./getUserEventGroups.handler";
import { listHandler } from "./list.handler";
import { listWithTeamHandler } from "./listWithTeam.handler";
import { get } from "./procedures/get";
import { updateHandler } from "./update.handler";
import { ZUpdateInputSchema } from "./update.schema";
import { eventOwnerProcedure } from "./util";

export const eventTypesRouter = router({
  getByViewer: authedProcedure.input(ZEventTypeInputSchema).query(async ({ ctx, input }) => {
    const timer = logP(`getByViewer(${ctx.user.id})`);
    const result = await getByViewerHandler({ ctx, input });
    timer();
    return result;
  }),

  getUserEventGroups: authedProcedure.input(ZEventTypeInputSchema).query(async ({ ctx, input }) => {
    const timer = logP(`getUserEventGroups(${ctx.user.id})`);
    const result = await getUserEventGroups({ ctx, input });
    timer();
    return result;
  }),

  getEventTypesFromGroup: authedProcedure
    .input(ZGetEventTypesFromGroupSchema)
    .query(async ({ ctx, input }) => {
      const timer = logP(`getEventTypesFromGroup(${ctx.user.id})`);
      const result = await getEventTypesFromGroup({ ctx, input });
      timer();
      return result;
    }),

  getTeamAndEventTypeOptions: authedProcedure
    .input(ZGetTeamAndEventTypeOptionsSchema)
    .query(async ({ ctx, input }) => {
      const timer = logP(`getTeamAndEventTypeOptions(${ctx.user.id})`);
      const result = await getTeamAndEventTypeOptions({ ctx, input });
      timer();
      return result;
    }),

  list: authedProcedure.query(async ({ ctx }) => {
    return listHandler({ ctx });
  }),

  listWithTeam: authedProcedure.query(async ({ ctx }) => {
    return listWithTeamHandler({ ctx });
  }),

  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    return createHandler({ ctx, input });
  }),

  get,

  update: eventOwnerProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    return updateHandler({ ctx, input });
  }),

  delete: eventOwnerProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    return deleteHandler({ ctx, input });
  }),

  duplicate: eventOwnerProcedure.input(ZDuplicateInputSchema).mutation(async ({ ctx, input }) => {
    return duplicateHandler({ ctx, input });
  }),

  bulkEventFetch: authedProcedure.query(async ({ ctx }) => {
    return bulkEventFetchHandler({ ctx });
  }),

  bulkUpdateToDefaultLocation: authedProcedure
    .input(
      z.object({
        eventTypeIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return bulkUpdateToDefaultLocationHandler({ ctx, input });
    }),
});
