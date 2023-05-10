import { authedProcedure, router } from "../../../trpc";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZEditInputSchema } from "./edit.schema";
import { ZFindKeyOfTypeInputSchema } from "./findKeyOfType.schema";

type ApiKeysRouterHandlerCache = {
  list?: typeof import("./list.handler").listHandler;
  findKeyOfType?: typeof import("./findKeyOfType.handler").findKeyOfTypeHandler;
  create?: typeof import("./create.handler").createHandler;
  edit?: typeof import("./edit.handler").editHandler;
  delete?: typeof import("./delete.handler").deleteHandler;
};

const UNSTABLE_HANDLER_CACHE: ApiKeysRouterHandlerCache = {};

export const apiKeysRouter = router({
  // List keys
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

  // Find key of type
  findKeyOfType: authedProcedure.input(ZFindKeyOfTypeInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.findKeyOfType) {
      UNSTABLE_HANDLER_CACHE.findKeyOfType = await import("./findKeyOfType.handler").then(
        (mod) => mod.findKeyOfTypeHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.findKeyOfType) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.findKeyOfType({
      ctx,
      input,
    });
  }),

  // Create a new key
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

  edit: authedProcedure.input(ZEditInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.edit) {
      UNSTABLE_HANDLER_CACHE.edit = await import("./edit.handler").then((mod) => mod.editHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.edit) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.edit({
      ctx,
      input,
    });
  }),

  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
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
