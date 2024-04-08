import authedProcedure from "../../../../procedures/authedProcedure";
import { importHandler } from "../../../../trpc";

const NAMESPACE = "organizations";
const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const getBrand = authedProcedure.query(async (opts) => {
  const handler = await importHandler(namespaced("getBrand"), () => import("../getBrand.handler"));
  return handler(opts);
});
