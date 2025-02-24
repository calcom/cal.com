import publicProcedure from "../../../procedures/publicProcedure";
import { importHandler } from "../../../trpc";
import { i18nInputSchema } from "../i18n.schema";

const NAMESPACE = "publicViewer";
const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const i18n = publicProcedure.input(i18nInputSchema).query(async (opts) => {
  const handler = await importHandler(namespaced("i18n"), () => import("../i18n.handler"));
  return handler(opts);
});
