import authedProcedure, { authedAdminProcedure } from "@calcom/trpc/server/procedures/authedProcedure";

import { router } from "../../../trpc";
import { ZCreateClientInputSchema } from "./createClient.schema";
import { ZGenerateAuthCodeInputSchema } from "./generateAuthCode.schema";
import { ZGetClientInputSchema } from "./getClient.schema";
import { ZListClientsInputSchema } from "./listClients.schema";
import { ZSubmitClientInputSchema, ZSubmitClientOutputSchema } from "./submitClient.schema";
import { ZUpdateClientInputSchema } from "./updateClient.schema";
import { ZDeleteClientInputSchema } from "./deleteClient.schema";

export const oAuthRouter = router({
  getClient: authedProcedure.input(ZGetClientInputSchema).query(async ({ input }) => {
    const { getClientHandler } = await import("./getClient.handler");

    return getClientHandler({
      input,
    });
  }),

  createClient: authedAdminProcedure.input(ZCreateClientInputSchema).mutation(async ({ ctx, input }) => {
    const { createClientHandler } = await import("./createClient.handler");

    return createClientHandler({
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
    const { updateClientStatusHandler } = await import("./updateClient.handler");

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
