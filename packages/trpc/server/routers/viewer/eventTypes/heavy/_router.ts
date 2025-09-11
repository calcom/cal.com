import { z } from "zod";

import { logP } from "@calcom/lib/perf";

import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZCreateInputSchema } from "./create.schema";
import { ZDuplicateInputSchema } from "./duplicate.schema";
import { eventOwnerProcedure } from "../util";
import { ZUpdateInputSchema } from "./update.schema";

type BookingsRouterHandlerCache = {
  create?: typeof import("./create.handler").createHandler;
  duplicate?: typeof import("./duplicate.handler").duplicateHandler;
  update?: typeof import("./update.handler").updateHandler;
};

const UNSTABLE_HANDLER_CACHE: BookingsRouterHandlerCache = {};

export const eventTypesRouter = router({
  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({
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
  update: eventOwnerProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    const { updateHandler } = await import("./update.handler");

    return updateHandler({
      ctx,
      input,
    });
  })
});
