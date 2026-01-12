import { z } from "zod";

import { logP } from "@calcom/lib/perf";
import { MembershipRole } from "@calcom/prisma/enums";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZGetActiveOnOptionsSchema } from "./getActiveOnOptions.schema";
import { ZEventTypeInputSchema, ZGetEventTypesFromGroupSchema } from "./getByViewer.schema";
import { ZGetHashedLinkInputSchema } from "./getHashedLink.schema";
import { ZGetHashedLinksInputSchema } from "./getHashedLinks.schema";
import { get } from "./procedures/get";
import { createEventPbacProcedure } from "./util";
import { z } from "zod";

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

  getActiveOnOptions: authedProcedure.input(ZGetActiveOnOptionsSchema).query(async ({ ctx, input }) => {
    const { getActiveOnOptions } = await import("./getActiveOnOptions.handler");

    const timer = logP(`getActiveOnOptions(${ctx.user.id})`);

    const result = await getActiveOnOptions({
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

  get,

  delete: createEventPbacProcedure("eventType.delete", [MembershipRole.ADMIN, MembershipRole.OWNER])
    .input(ZDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { deleteHandler } = await import("./delete.handler");

      return deleteHandler({
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

  // Toggle event type favorite for the current user
  toggleFavorite: authedProcedure
    .input(
      z.object({
        eventTypeId: z.number(),
        favorite: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { toggleFavoriteHandler } = await import("./toggleFavorite.handler");
      return toggleFavoriteHandler({ ctx, input });
    }),

  // List favorite event type ids for current user
  listFavorites: authedProcedure.query(async ({ ctx }) => {
    const { listFavoritesHandler } = await import("./listFavorites.handler");
    return listFavoritesHandler({ ctx });
  }),
});
