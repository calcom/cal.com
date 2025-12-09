import authedProcedure, { authedAdminProcedure } from "@calcom/trpc/server/procedures/authedProcedure";

import { router } from "../../../trpc";
import { ZAddClientInputSchema } from "./addClient.schema";
import { ZGenerateAuthCodeInputSchema } from "./generateAuthCode.schema";
import { ZGetClientInputSchema } from "./getClient.schema";
import { ZListClientsInputSchema } from "./listClients.schema";
import { ZSubmitClientInputSchema } from "./submitClient.schema";
import { ZUpdateClientStatusInputSchema } from "./updateClientStatus.schema";

type _OAuthRouterHandlerCache = {
  getClient?: typeof import("./getClient.handler").getClientHandler;
  addClient?: typeof import("./addClient.handler").addClientHandler;
  generateAuthCode?: typeof import("./generateAuthCode.handler").generateAuthCodeHandler;
  submitClient?: typeof import("./submitClient.handler").submitClientHandler;
  listClients?: typeof import("./listClients.handler").listClientsHandler;
  listUserClients?: typeof import("./listUserClients.handler").listUserClientsHandler;
  updateClientStatus?: typeof import("./updateClientStatus.handler").updateClientStatusHandler;
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

  submitClient: authedProcedure.input(ZSubmitClientInputSchema).mutation(async ({ ctx, input }) => {
    const { submitClientHandler } = await import("./submitClient.handler");

    return submitClientHandler({
      ctx,
      input,
    });
  }),

  listClients: authedAdminProcedure.input(ZListClientsInputSchema).query(async ({ input }) => {
    const { listClientsHandler } = await import("./listClients.handler");

    return listClientsHandler({
      input,
    });
  }),

  listUserClients: authedProcedure.query(async ({ ctx }) => {
    const { listUserClientsHandler } = await import("./listUserClients.handler");

    return listUserClientsHandler({
      ctx,
    });
  }),

  updateClientStatus: authedAdminProcedure.input(ZUpdateClientStatusInputSchema).mutation(async ({ ctx, input }) => {
    const { updateClientStatusHandler } = await import("./updateClientStatus.handler");

    return updateClientStatusHandler({
      ctx,
      input,
    });
  }),
});
