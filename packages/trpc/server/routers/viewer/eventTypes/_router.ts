import { z } from "zod";

import { logP } from "@calcom/lib/perf";
import { MembershipRole } from "@calcom/prisma/enums";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZEventTypeInputSchema, ZGetEventTypesFromGroupSchema } from "./getByViewer.schema";
import { ZGetHashedLinkInputSchema } from "./getHashedLink.schema";
import { ZGetHashedLinksInputSchema } from "./getHashedLinks.schema";
import { ZGetTeamAndEventTypeOptionsSchema } from "./getTeamAndEventTypeOptions.schema";
import { get } from "./procedures/get";
import { createEventPbacProcedure } from "./util";

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
});
