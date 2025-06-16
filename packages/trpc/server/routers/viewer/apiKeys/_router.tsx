import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
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

export const apiKeysRouter = router({
  // List keys
  list: authedProcedure.query(async ({ ctx }) => {
    const { listHandler } = await import("./list.handler");

    return listHandler({
      ctx,
    });
  }),

  // Find key of type
  findKeyOfType: authedProcedure.input(ZFindKeyOfTypeInputSchema).query(async ({ ctx, input }) => {
    const { findKeyOfTypeHandler } = await import("./findKeyOfType.handler");

    return findKeyOfTypeHandler({
      ctx,
      input,
    });
  }),

  // Create a new key
  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({
      ctx,
      input,
    });
  }),

  edit: authedProcedure.input(ZEditInputSchema).mutation(async ({ ctx, input }) => {
    const { editHandler } = await import("./edit.handler");

    return editHandler({
      ctx,
      input,
    });
  }),

  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteHandler } = await import("./delete.handler");

    return deleteHandler({
      ctx,
      input,
    });
  }),
});
