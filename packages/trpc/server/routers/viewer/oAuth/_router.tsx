import authedProcedure, { authedAdminProcedure } from "@calcom/trpc/server/procedures/authedProcedure";

import { router } from "../../../trpc";
import { ZAddClientInputSchema } from "./addClient.schema";
import { ZGenerateAuthCodeInputSchema } from "./generateAuthCode.schema";
import { ZGetClientInputSchema } from "./getClient.schema";
import { ZListClientsInputSchema } from "./listClients.schema";
import { ZSubmitClientInputSchema, ZSubmitClientOutputSchema } from "./submitClient.schema";
import { ZUpdateClientInputSchema, ZUpdateClientStatusInputSchema } from "./updateClientStatus.schema";
import { ZDeleteClientInputSchema } from "./deleteClient.schema";

type _OAuthRouterHandlerCache = {
  getClient?: typeof import("./getClient.handler").getClientHandler;
  addClient?: typeof import("./addClient.handler").addClientHandler;
  generateAuthCode?: typeof import("./generateAuthCode.handler").generateAuthCodeHandler;
  submitClient?: typeof import("./submitClient.handler").submitClientHandler;
  listClients?: typeof import("./listClients.handler").listClientsHandler;
  listUserClients?: typeof import("./listUserClients.handler").listUserClientsHandler;
  updateClient?: typeof import("./updateClientStatus.handler").updateClientStatusHandler;
  updateClientStatus?: typeof import("./updateClientStatus.handler").updateClientStatusHandler;
  deleteClient?: typeof import("./deleteClient.handler").deleteClientHandler;
};

export const oAuthRouter = router({
  getClient: authedProcedure.input(ZGetClientInputSchema).query(async ({ input }) => {
    const { getClientHandler } = await import("./getClient.handler");

    return getClientHandler({
      input,
    });
  }),

  addClient: authedAdminProcedure.input(ZAddClientInputSchema).mutation(async ({ ctx, input }) => {
    const { addClientHandler } = await import("./addClient.handler");

    return addClientHandler({
      ctx,
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

  submitClient: authedProcedure
    .input(ZSubmitClientInputSchema)
    .output(ZSubmitClientOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const { submitClientHandler } = await import("./submitClient.handler");

      return submitClientHandler({
        ctx,
        input,
      });
    }),

  listClients: authedAdminProcedure.input(ZListClientsInputSchema).query(async ({ ctx, input }) => {
    const { listClientsHandler } = await import("./listClients.handler");

    return listClientsHandler({
      ctx,
      input,
    });
  }),

  listUserClients: authedProcedure.query(async ({ ctx }) => {
    const { listUserClientsHandler } = await import("./listUserClients.handler");

    return listUserClientsHandler({
      ctx,
    });
  }),

  updateClient: authedProcedure.input(ZUpdateClientInputSchema).mutation(async ({ ctx, input }) => {
    const { updateClientStatusHandler } = await import("./updateClientStatus.handler");

    return updateClientStatusHandler({
      ctx,
      input,
    });
  }),

  updateClientStatus: authedAdminProcedure.input(ZUpdateClientStatusInputSchema).mutation(async ({ ctx, input }) => {
    const { updateClientStatusHandler } = await import("./updateClientStatus.handler");

    return updateClientStatusHandler({
      ctx,
      input,
    });
  }),

  deleteClient: authedProcedure.input(ZDeleteClientInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteClientHandler } = await import("./deleteClient.handler");

    return deleteClientHandler({
      ctx,
      input,
    });
  }),
});
