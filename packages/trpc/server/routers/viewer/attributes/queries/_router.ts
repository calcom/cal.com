import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZFindTeamMembersMatchingAttributeLogicInputSchema } from "./findTeamMembersMatchingAttributeLogic.schema";
import { getAttributeSchema } from "./get.schema";
import { getByUserIdSchema } from "./getByUserId.schema";

export const attributesQueriesRouter = router({
  list: authedProcedure.query(async (opts) => {
    const { default: handler } = await import("./list.handler");
    return handler(opts);
  }),
  get: authedProcedure.input(getAttributeSchema).query(async (opts) => {
    const { default: handler } = await import("./get.handler");
    return handler(opts);
  }),
  getByUserId: authedProcedure.input(getByUserIdSchema).query(async ({ ctx, input }) => {
    const { default: handler } = await import("./getByUserId.handler");
    return handler({ ctx, input });
  }),
  findTeamMembersMatchingAttributeLogic: authedProcedure
    .input(ZFindTeamMembersMatchingAttributeLogicInputSchema)
    .query(async ({ ctx, input }) => {
      const { default: handler } = await import("./findTeamMembersMatchingAttributeLogic.handler");
      return handler({ ctx, input });
    }),
});
