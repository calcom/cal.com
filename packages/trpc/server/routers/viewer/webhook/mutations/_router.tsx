import { router } from "../../../../trpc";
import { webhookProcedure } from "../util";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZEditInputSchema } from "./edit.schema";
import { ZTestTriggerInputSchema } from "./testTrigger.schema";

export const webhookMutationsRouter = router({
  create: webhookProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({
      ctx,
      input,
    });
  }),

  edit: webhookProcedure.input(ZEditInputSchema).mutation(async ({ ctx, input }) => {
    const { editHandler } = await import("./edit.handler");

    return editHandler({
      ctx,
      input,
    });
  }),

  delete: webhookProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteHandler } = await import("./delete.handler");

    return deleteHandler({
      ctx,
      input,
    });
  }),

  testTrigger: webhookProcedure.input(ZTestTriggerInputSchema).mutation(async ({ ctx, input }) => {
    const { testTriggerHandler } = await import("./testTrigger.handler");

    return testTriggerHandler({
      ctx,
      input,
    });
  }),
});
