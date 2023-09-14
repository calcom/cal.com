import { z } from "zod";

import { logP } from "@calcom/lib/perf";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZDuplicateInputSchema } from "./duplicate.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZEventTypeInputSchema } from "./getByViewer.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { eventOwnerProcedure } from "./util";

type BookingsRouterHandlerCache = {
  getByViewer?: typeof import("./getByViewer.handler").getByViewerHandler;
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

const UNSTABLE_HANDLER_CACHE: BookingsRouterHandlerCache = {};

export const eventTypesRouter = router({
  // REVIEW: What should we name this procedure?
  getByViewer: authedProcedure.input(ZEventTypeInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.getByViewer) {
      UNSTABLE_HANDLER_CACHE.getByViewer = await import("./getByViewer.handler").then(
        (mod) => mod.getByViewerHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getByViewer) {
      throw new Error("Failed to load handler");
    }

    const timer = logP(`getByViewer(${ctx.user.id})`);

    const result = await UNSTABLE_HANDLER_CACHE.getByViewer({
      ctx,
      input,
    });

    timer();

    return result;
  }),

  list: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.list) {
      UNSTABLE_HANDLER_CACHE.list = await import("./list.handler").then((mod) => mod.listHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.list) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.list({
      ctx,
    });
  }),

  listWithTeam: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.listWithTeam) {
      UNSTABLE_HANDLER_CACHE.listWithTeam = await import("./listWithTeam.handler").then(
        (mod) => mod.listWithTeamHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.listWithTeam) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.listWithTeam({
      ctx,
    });
  }),

  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.create) {
      UNSTABLE_HANDLER_CACHE.create = await import("./create.handler").then((mod) => mod.createHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.create) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.create({
      ctx,
      input,
    });
  }),

  get: eventOwnerProcedure.input(ZGetInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.get) {
      UNSTABLE_HANDLER_CACHE.get = await import("./get.handler").then((mod) => mod.getHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.get) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.get({
      ctx,
      input,
    });
  }),

  update: eventOwnerProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.update) {
      UNSTABLE_HANDLER_CACHE.update = await import("./update.handler").then((mod) => mod.updateHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.update) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.update({
      ctx,
      input,
    });
  }),

  delete: eventOwnerProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.delete) {
      UNSTABLE_HANDLER_CACHE.delete = await import("./delete.handler").then((mod) => mod.deleteHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.delete) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.delete({
      ctx,
      input,
    });
  }),

  duplicate: eventOwnerProcedure.input(ZDuplicateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.duplicate) {
      UNSTABLE_HANDLER_CACHE.duplicate = await import("./duplicate.handler").then(
        (mod) => mod.duplicateHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.duplicate) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.duplicate({
      ctx,
      input,
    });
  }),

  bulkEventFetch: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.bulkEventFetch) {
      UNSTABLE_HANDLER_CACHE.bulkEventFetch = await import("./bulkEventFetch.handler").then(
        (mod) => mod.bulkEventFetchHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.bulkEventFetch) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.bulkEventFetch({
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
      if (!UNSTABLE_HANDLER_CACHE.bulkUpdateToDefaultLocation) {
        UNSTABLE_HANDLER_CACHE.bulkUpdateToDefaultLocation = await import(
          "./bulkUpdateToDefaultLocation.handler"
        ).then((mod) => mod.bulkUpdateToDefaultLocationHandler);
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.bulkUpdateToDefaultLocation) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.bulkUpdateToDefaultLocation({
        ctx,
        input,
      });
    }),
});
