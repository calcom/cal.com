import authedProcedure, { authedAdminProcedure } from "@calcom/trpc/server/procedures/authedProcedure";

import { router } from "../../../trpc";
import { ZAddClientInputSchema } from "./addClient.schema";
import { ZGenerateAuthCodeInputSchema } from "./generateAuthCode.schema";
import { ZGetClientInputSchema } from "./getClient.schema";

type OAuthRouterHandlerCache = {
  getClient?: typeof import("./getClient.handler").getClientHandler;
  addClient?: typeof import("./addClient.handler").addClientHandler;
  generateAuthCode?: typeof import("./generateAuthCode.handler").generateAuthCodeHandler;
};

export const oAuthRouter = router({
  getClient: authedProcedure.input(ZGetClientInputSchema).query(async ({ input }) => {
    const { getClientHandler } = await import("./getClient.handler");

    return getClientHandler({
      input,
    });
  }),

  addClient: authedAdminProcedure.input(ZAddClientInputSchema).mutation(async ({ input }) => {
    const { addClientHandler } = await import("./addClient.handler");

    return addClientHandler({
      input,
    });
  }),

  generateAuthCode: authedProcedure.input(ZGenerateAuthCodeInputSchema).mutation(async ({ ctx, input }) => {
    const { generateAuthCodeHandler } = await import("./generateAuthCode.handler");

    return generateAuthCodeHandler({
      ctx,
      input,
    });
  }),
});
