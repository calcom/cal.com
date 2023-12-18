import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZScheduleDuplicateSchema } from "./duplicate.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZGetByEventSlugInputSchema } from "./getScheduleByEventTypeSlug.schema";
import { ZGetByUserIdInputSchema } from "./getScheduleByUserId.schema";
import { ZUpdateInputSchema } from "./update.schema";

type ScheduleRouterHandlerCache = {
  get?: typeof import("./get.handler").getHandler;
  create?: typeof import("./create.handler").createHandler;
  delete?: typeof import("./delete.handler").deleteHandler;
  update?: typeof import("./update.handler").updateHandler;
  duplicate?: typeof import("./duplicate.handler").duplicateHandler;
  getScheduleByUserId?: typeof import("./getScheduleByUserId.handler").getScheduleByUserIdHandler;
  getScheduleByEventSlug?: typeof import("./getScheduleByEventTypeSlug.handler").getScheduleByEventSlugHandler;
};

const UNSTABLE_HANDLER_CACHE: ScheduleRouterHandlerCache = {};

export const scheduleRouter = router({
  get: authedProcedure.input(ZGetInputSchema).query(async ({ input, ctx }) => {
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

  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ input, ctx }) => {
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

  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async ({ input, ctx }) => {
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

  update: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ input, ctx }) => {
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

  duplicate: authedProcedure.input(ZScheduleDuplicateSchema).mutation(async ({ input, ctx }) => {
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

  getScheduleByUserId: authedProcedure.input(ZGetByUserIdInputSchema).query(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getScheduleByUserId) {
      UNSTABLE_HANDLER_CACHE.getScheduleByUserId = await import("./getScheduleByUserId.handler").then(
        (mod) => mod.getScheduleByUserIdHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getScheduleByUserId) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getScheduleByUserId({
      ctx,
      input,
    });
  }),
  getScheduleByEventSlug: authedProcedure.input(ZGetByEventSlugInputSchema).query(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getScheduleByEventSlug) {
      UNSTABLE_HANDLER_CACHE.getScheduleByEventSlug = await import(
        "./getScheduleByEventTypeSlug.handler"
      ).then((mod) => mod.getScheduleByEventSlugHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getScheduleByEventSlug) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getScheduleByEventSlug({
      ctx,
      input,
    });
  }),
});
