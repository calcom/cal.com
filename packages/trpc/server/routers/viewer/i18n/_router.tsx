import publicProcedure from "../../../procedures/publicProcedure";
import { importHandler, router } from "../../../trpc";
import { i18nInputSchema } from "./i18n.schema";

const NAMESPACE = "viewer";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const i18nRouter = router({
  get: publicProcedure.input(i18nInputSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("i18n"), () => import("./i18n.handler"));
    return handler(opts);
  }),
});
