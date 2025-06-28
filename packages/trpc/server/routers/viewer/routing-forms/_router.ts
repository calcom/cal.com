import authedProcedure from "../../../procedures/authedProcedure";
import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { ZFindTeamMembersMatchingAttributeLogicOfRouteInputSchema } from "./findTeamMembersMatchingAttributeLogicOfRoute.schema";
import { ZResponseInputSchema } from "./response.schema";

const NAMESPACE = "routingForms";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const routingFormsRouter = router({
  findTeamMembersMatchingAttributeLogicOfRoute: authedProcedure
    .input(ZFindTeamMembersMatchingAttributeLogicOfRouteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { default: handler } = await import("./findTeamMembersMatchingAttributeLogicOfRoute.handler");
      return handler({ ctx, input });
    }),

  public: router({
    response: publicProcedure.input(ZResponseInputSchema).mutation(async ({ ctx, input }) => {
      const { default: handler } = await import("./response.handler");
      return handler({ ctx, input });
    }),
  }),
});
