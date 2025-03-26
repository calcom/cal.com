import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
// Static import for the handler
import { i18nHandler } from "./i18n.handler";
import { i18nInputSchema } from "./i18n.schema";

export const i18nRouter = router({
  get: publicProcedure.input(i18nInputSchema).query(async (opts) => {
    return i18nHandler(opts);
  }),
});
