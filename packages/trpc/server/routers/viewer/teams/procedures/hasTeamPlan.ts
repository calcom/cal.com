import authedProcedure from "../../../../procedures/authedProcedure";
import { importHandler } from "../../../../trpc";

const NAMESPACE = "teams";
const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const hasTeamPlan = authedProcedure.query(async (opts) => {
  const handler = await importHandler(namespaced("hasTeamPlan"), () => import("../hasTeamPlan.handler"));
  return handler(opts);
});
