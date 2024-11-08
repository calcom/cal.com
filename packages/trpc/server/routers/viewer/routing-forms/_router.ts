import authedProcedure from "../../../procedures/authedProcedure";
import { router, importHandler } from "../../../trpc";
import { ZFindTeamMembersMatchingAttributeLogicInputSchema } from "./findTeamMembersMatchingAttributeLogic.schema";

const NAMESPACE = "routingForms";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const routingFormsRouter = router({
  findTeamMembersMatchingAttributeLogic: authedProcedure
    .input(ZFindTeamMembersMatchingAttributeLogicInputSchema)
    .mutation(async ({ ctx, input }) => {
      const handler = await importHandler(
        namespaced("findTeamMembersMatchingAttributeLogic"),
        () => import("./findTeamMembersMatchingAttributeLogic.handler")
      );
      return handler({ ctx, input });
    }),
});
