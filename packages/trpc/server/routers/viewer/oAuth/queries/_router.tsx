import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZGetClientInputSchema } from "./getClient.schema";

export const oAuthQueriesRouter = router({
  getClient: authedProcedure.input(ZGetClientInputSchema).query(async ({ input }) => {
    const { getClientHandler } = await import("./getClient.handler");

    return getClientHandler({
      input,
    });
  }),
});
