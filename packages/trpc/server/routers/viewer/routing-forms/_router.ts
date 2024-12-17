import authedProcedure from "../../../procedures/authedProcedure";
import { router, importHandler } from "../../../trpc";
import { ZFindTeamMembersMatchingAttributeLogicOfRouteInputSchema } from "./findTeamMembersMatchingAttributeLogicOfRoute.schema";

const NAMESPACE = "routingForms";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const routingFormsRouter = router({
  findTeamMembersMatchingAttributeLogicOfRoute: authedProcedure
    .input(ZFindTeamMembersMatchingAttributeLogicOfRouteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = await importHandler(
        namespaced("findTeamMembersMatchingAttributeLogicOfRoute"),
        () => import("./findTeamMembersMatchingAttributeLogicOfRoute.handler")
      );
      return handler({ ctx, input });
    }),
});
