import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { eventOwnerProcedure } from "../eventTypes/util";
import { ZCreateInputSchema } from "./create.schema";
import { ZCreateWebCallInputSchema } from "./createWebCall.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZListInputSchema } from "./list.schema";
import { ZListCallsInputSchema } from "./listCalls.schema";
import { ZTestCallInputSchema } from "./testCall.schema";
import { ZUpdateInputSchema } from "./update.schema";

export const aiVoiceAgentRouter = router({
  list: authedProcedure.input(ZListInputSchema).query(async ({ ctx, input }) => {
    const { listHandler } = await import("./list.handler");

    return listHandler({
      ctx,
      input,
    });
  }),

  get: authedProcedure.input(ZGetInputSchema).query(async ({ ctx, input }) => {
    const { getHandler } = await import("./get.handler");

    return getHandler({
      ctx,
      input,
    });
  }),

  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({
      ctx,
      input,
    });
  }),

  update: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    const { updateHandler } = await import("./update.handler");

    return updateHandler({
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

  testCall: authedProcedure.input(ZTestCallInputSchema).mutation(async ({ ctx, input }) => {
    const { testCallHandler } = await import("./testCall.handler");

    return testCallHandler({
      ctx,
      input,
    });
  }),

  listCalls: authedProcedure.input(ZListCallsInputSchema).query(async ({ ctx, input }) => {
    const { listCallsHandler } = await import("./listCalls.handler");

    return listCallsHandler({
      ctx,
      input,
    });
   }),

  createWebCall: eventOwnerProcedure.input(ZCreateWebCallInputSchema).mutation(async ({ ctx, input }) => {
    const { createWebCallHandler } = await import("./createWebCall.handler");

    return createWebCallHandler({
      ctx,
      input,
    });
  }),
});
