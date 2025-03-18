import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCreateFilterSegmentInputSchema } from "./create.schema";
import { ZDeleteFilterSegmentInputSchema } from "./delete.schema";
import { ZListFilterSegmentsInputSchema } from "./list.schema";
import { ZUpdateFilterSegmentInputSchema } from "./update.schema";

type FilterSegmentsRouterHandlerCache = {
  list?: typeof import("./list.handler").listHandler;
  create?: typeof import("./create.handler").createHandler;
  update?: typeof import("./update.handler").updateHandler;
  delete?: typeof import("./delete.handler").deleteHandler;
};

const UNSTABLE_HANDLER_CACHE: FilterSegmentsRouterHandlerCache = {};

export const filterSegmentsRouter = router({
  list: authedProcedure.input(ZListFilterSegmentsInputSchema).query(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.list) {
      UNSTABLE_HANDLER_CACHE.list = await import("./list.handler").then((mod) => mod.listHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.list) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.list({
      ctx,
      input,
    });
  }),

  create: authedProcedure.input(ZCreateFilterSegmentInputSchema).mutation(async ({ input, ctx }) => {
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

  update: authedProcedure.input(ZUpdateFilterSegmentInputSchema).mutation(async ({ input, ctx }) => {
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

  delete: authedProcedure.input(ZDeleteFilterSegmentInputSchema).mutation(async ({ input, ctx }) => {
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
});
