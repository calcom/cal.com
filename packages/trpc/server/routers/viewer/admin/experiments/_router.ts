import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import {
  ZExperimentsSetWinnerSchema,
  ZExperimentsUpdateStatusSchema,
  ZExperimentsUpdateVariantWeightSchema,
} from "./experiments.schema";

export const experimentsRouter = router({
  list: authedAdminProcedure.query(async () => {
    const { default: handler } = await import("./list.handler");
    return handler();
  }),
  updateStatus: authedAdminProcedure.input(ZExperimentsUpdateStatusSchema).mutation(async (opts) => {
    const { default: handler } = await import("./updateStatus.handler");
    return handler(opts);
  }),
  updateVariantWeight: authedAdminProcedure
    .input(ZExperimentsUpdateVariantWeightSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./updateVariantWeight.handler");
      return handler(opts);
    }),
  setWinner: authedAdminProcedure.input(ZExperimentsSetWinnerSchema).mutation(async (opts) => {
    const { default: handler } = await import("./setWinner.handler");
    return handler(opts);
  }),
});
