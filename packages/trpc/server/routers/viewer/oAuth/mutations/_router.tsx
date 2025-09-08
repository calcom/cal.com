import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZAddClientInputSchema } from "./addClient.schema";
import { ZGenerateAuthCodeInputSchema } from "./generateAuthCode.schema";

export const oAuthRouter = router({
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
