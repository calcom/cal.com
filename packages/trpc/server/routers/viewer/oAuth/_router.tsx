import authedProcedure, { authedAdminProcedure } from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCreateClientInputSchema } from "./createClient.schema";
import { ZDeleteClientInputSchema } from "./deleteClient.schema";
import { ZGenerateAuthCodeInputSchema } from "./generateAuthCode.schema";
import { ZGetClientForAuthorizationInputSchema } from "./getClientForAuthorization.schema";
import { ZCountAuthorizedUsersInputSchema } from "./countAuthorizedUsers.schema";
import { ZListAuthorizedUsersInputSchema } from "./listAuthorizedUsers.schema";
import { ZListClientsInputSchema } from "./listClients.schema";
import { ZCreateClientSecretInputSchema } from "./secrets/create/schema";
import { ZDeleteClientSecretInputSchema } from "./secrets/delete/schema";
import { ZGetClientSecretsInputSchema } from "./secrets/get/schema";
import { ZSubmitClientInputSchema, ZSubmitClientOutputSchema } from "./submitClientForReview.schema";
import { ZUpdateClientInputSchema } from "./updateClient.schema";

export const oAuthRouter = router({
  getClientForAuthorization: authedProcedure
    .input(ZGetClientForAuthorizationInputSchema)
    .query(async ({ ctx, input }) => {
      const { getClientForAuthorizationHandler } = await import("./getClientForAuthorization.handler");

      return getClientForAuthorizationHandler({
        ctx,
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

  submitClientForReview: authedProcedure
    .input(ZSubmitClientInputSchema)
    .output(ZSubmitClientOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const { submitClientForReviewHandler } = await import("./submitClientForReview.handler");

      return submitClientForReviewHandler({
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

  listAuthorizedUsers: authedProcedure
    .input(ZListAuthorizedUsersInputSchema)
    .query(async ({ ctx, input }) => {
      const { listAuthorizedUsersHandler } = await import("./listAuthorizedUsers.handler");

      return listAuthorizedUsersHandler({
        ctx,
        input,
      });
    }),

  countAuthorizedUsers: authedProcedure
    .input(ZCountAuthorizedUsersInputSchema)
    .query(async ({ ctx, input }) => {
      const { countAuthorizedUsersHandler } = await import("./countAuthorizedUsers.handler");

      return countAuthorizedUsersHandler({
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
    const { updateClientHandler } = await import("./updateClient.handler");

    return updateClientHandler({
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

  getClientSecrets: authedProcedure.input(ZGetClientSecretsInputSchema).query(async ({ ctx, input }) => {
    const { getClientSecretsHandler } = await import("./secrets/get/handler");

    return getClientSecretsHandler({
      ctx,
      input,
    });
  }),

  createClientSecret: authedProcedure
    .input(ZCreateClientSecretInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { createClientSecretHandler } = await import("./secrets/create/handler");

      return createClientSecretHandler({
        ctx,
        input,
      });
    }),

  deleteClientSecret: authedProcedure
    .input(ZDeleteClientSecretInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { deleteClientSecretHandler } = await import("./secrets/delete/handler");

      return deleteClientSecretHandler({
        ctx,
        input,
      });
    }),
});
