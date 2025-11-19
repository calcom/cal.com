import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZDeleteCredentialInputSchema } from "./deleteCredential.schema";

type CredentialsRouterHandlerCache = {
  deleteCredential?: typeof import("./deleteCredential.handler").deleteCredentialHandler;
};

export const credentialsRouter = router({
  delete: authedProcedure.input(ZDeleteCredentialInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteCredentialHandler } = await import("./deleteCredential.handler");

    return deleteCredentialHandler({ ctx, input });
  }),
});
