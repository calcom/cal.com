import { z } from "zod";

import { logP } from "@calcom/lib/perf";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZDuplicateInputSchema } from "./duplicate.schema";
import { ZEventTypeInputSchema, ZGetEventTypesFromGroupSchema } from "./getByViewer.schema";
import { ZGetHashedLinkInputSchema } from "./getHashedLink.schema";
import { ZGetHashedLinksInputSchema } from "./getHashedLinks.schema";
import { ZGetTeamAndEventTypeOptionsSchema } from "./getTeamAndEventTypeOptions.schema";
import { get } from "./procedures/get";
import { ZUpdateInputSchema } from "./update.schema";
import { eventOwnerProcedure } from "./util";

type BookingsRouterHandlerCache = {
  getByViewer?: typeof import("./getByViewer.handler").getByViewerHandler;
  getUserEventGroups?: typeof import("./getUserEventGroups.handler").getUserEventGroups;
  getEventTypesFromGroup?: typeof import("./getEventTypesFromGroup.handler").getEventTypesFromGroup;
  getTeamAndEventTypeOptions?: typeof import("./getTeamAndEventTypeOptions.handler").getTeamAndEventTypeOptions;
  list?: typeof import("./list.handler").listHandler;
  listWithTeam?: typeof import("./listWithTeam.handler").listWithTeamHandler;
  create?: typeof import("./create.handler").createHandler;
  get?: typeof import("./get.handler").getHandler;
  update?: typeof import("./update.handler").updateHandler;
  delete?: typeof import("./delete.handler").deleteHandler;
  duplicate?: typeof import("./duplicate.handler").duplicateHandler;
  bulkEventFetch?: typeof import("./bulkEventFetch.handler").bulkEventFetchHandler;
  bulkUpdateToDefaultLocation?: typeof import("./bulkUpdateToDefaultLocation.handler").bulkUpdateToDefaultLocationHandler;
};

// Init the handler cache
const UNSTABLE_HANDLER_CACHE: BookingsRouterHandlerCache = {};

export const eventTypesRouter = router({
  // REVIEW: What should we name this procedure?
  getByViewer: authedProcedure.input(ZEventTypeInputSchema).query(async ({ ctx, input }) => {
    const { getByViewerHandler } = await import("./getByViewer.handler");

    const timer = logP(`getByViewer(${ctx.user.id})`);

    const result = await getByViewerHandler({
      ctx,
      input,
    });

    timer();

    return result;
  }),
  getUserEventGroups: authedProcedure.input(ZEventTypeInputSchema).query(async ({ ctx, input }) => {
    const { getUserEventGroups } = await import("./getUserEventGroups.handler");

    const timer = logP(`getUserEventGroups(${ctx.user.id})`);

    const result = await getUserEventGroups({
      ctx,
      input,
    });

    timer();

    return result;
  }),

  getEventTypesFromGroup: authedProcedure
    .input(ZGetEventTypesFromGroupSchema)
    .query(async ({ ctx, input }) => {
      const { getEventTypesFromGroup } = await import("./getEventTypesFromGroup.handler");

      const timer = logP(`getEventTypesFromGroup(${ctx.user.id})`);

      const result = await getEventTypesFromGroup({
        ctx,
        input,
      });

      timer();

      return result;
    }),

  getTeamAndEventTypeOptions: authedProcedure
    .input(ZGetTeamAndEventTypeOptionsSchema)
    .query(async ({ ctx, input }) => {
      const { getTeamAndEventTypeOptions } = await import("./getTeamAndEventTypeOptions.handler");

      const timer = logP(`getTeamAndEventTypeOptions(${ctx.user.id})`);

      const result = await getTeamAndEventTypeOptions({
        ctx,
        input,
      });

      timer();

      return result;
    }),

  list: authedProcedure.query(async ({ ctx }) => {
    const { listHandler } = await import("./list.handler");

    return listHandler({
      ctx,
    });
  }),

  listWithTeam: authedProcedure.query(async ({ ctx }) => {
    const { listWithTeamHandler } = await import("./listWithTeam.handler");

    return listWithTeamHandler({
      ctx,
    });
  }),

  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({
      ctx,
      input,
    });
  }),

  get,

  update: eventOwnerProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    const { updateHandler } = await import("./update.handler");

    return updateHandler({
      ctx,
      input,
    });
  }),

  delete: eventOwnerProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteHandler } = await import("./delete.handler");

    return deleteHandler({
      ctx,
      input,
    });
  }),

  duplicate: eventOwnerProcedure.input(ZDuplicateInputSchema).mutation(async ({ ctx, input }) => {
    const { duplicateHandler } = await import("./duplicate.handler");

    return duplicateHandler({
      ctx,
      input,
    });
  }),

  bulkEventFetch: authedProcedure.query(async ({ ctx }) => {
    const { bulkEventFetchHandler } = await import("./bulkEventFetch.handler");

    return bulkEventFetchHandler({
      ctx,
    });
  }),

  bulkUpdateToDefaultLocation: authedProcedure
    .input(
      z.object({
        eventTypeIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { bulkUpdateToDefaultLocationHandler } = await import("./bulkUpdateToDefaultLocation.handler");

      return bulkUpdateToDefaultLocationHandler({
        ctx,
        input,
      });
    }),

  getHashedLink: authedProcedure.input(ZGetHashedLinkInputSchema).query(async ({ ctx, input }) => {
    const { getHashedLinkHandler } = await import("./getHashedLink.handler");

    return getHashedLinkHandler({
      ctx,
      input,
    });
  }),

  getHashedLinks: authedProcedure.input(ZGetHashedLinksInputSchema).query(async ({ ctx, input }) => {
    const { getHashedLinksHandler } = await import("./getHashedLinks.handler");

    return getHashedLinksHandler({
      ctx,
      input,
    });
  }),
});
