import authedProcedure from "../../../../procedures/authedProcedure";
import "../../../../trpc";

const NAMESPACE = "teams";
const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const hasTeamPlan = authedProcedure.query(async (opts) => {
  const { default: handler } = await import("../hasTeamPlan.handler");
  return handler(opts);
});
