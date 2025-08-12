import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { i18nInputSchema } from "./i18n.schema";

export const i18nRouter = router({
  get: publicProcedure.input(i18nInputSchema).query(async (opts) => {
    const handler = (await import("./i18n.handler")).i18nHandler;
    return handler(opts);
  }),
});
