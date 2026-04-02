import type { NextApiRequest } from "next";
import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZBuyInputSchema } from "./buy.schema";
import { ZCancelInputSchema } from "./cancel.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZImportInputSchema } from "./import.schema";
import { ZListInputSchema } from "./list.schema";
import { ZUpdateInputSchema } from "./update.schema";

export const phoneNumberRouter = router({
  list: authedProcedure.input(ZListInputSchema).query(async ({ ctx, input }) => {
    const { listHandler } = await import("./list.handler");

    return listHandler({
      ctx,
      input,
    });
  }),

  buy: authedProcedure.input(ZBuyInputSchema).mutation(async ({ ctx, input }) => {
    const { buyHandler } = await import("./buy.handler");

    return buyHandler({
      ctx: { ...ctx, req: ctx.req as NextApiRequest },
      input,
    });
  }),

  import: authedProcedure.input(ZImportInputSchema).mutation(async ({ ctx, input }) => {
    const { importHandler } = await import("./import.handler");

    return importHandler({
      ctx,
      input,
    });
  }),

  cancel: authedProcedure.input(ZCancelInputSchema).mutation(async ({ ctx, input }) => {
    const { cancelHandler } = await import("./cancel.handler");

    return cancelHandler({
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

  update: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    const { updateHandler } = await import("./update.handler");

    return updateHandler({
      ctx,
      input,
    });
  }),
});
