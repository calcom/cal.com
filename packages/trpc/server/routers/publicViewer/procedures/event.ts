import publicProcedure from "../../../procedures/publicProcedure";
import { importHandler } from "../../../trpc";
import { ZEventInputSchema } from "../event.schema";

const NAMESPACE = "publicViewer";
const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const event = publicProcedure.input(ZEventInputSchema).query(async (opts) => {
  const handler = await importHandler(namespaced("event"), () => import("../event.handler"));
  return handler(opts);
});
