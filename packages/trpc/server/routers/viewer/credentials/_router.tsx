import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZDeleteCredentialInputSchema } from "./deleteCredential.schema";

type CredentialsRouterHandlerCache = {
  deleteCredential?: typeof import("./deleteCredential.handler").deleteCredentialHandler;
};

const UNSTABLE_HANDLER_CACHE: CredentialsRouterHandlerCache = {};

export const credentialsRouter = router({
  delete: authedProcedure.input(ZDeleteCredentialInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.deleteCredential) {
      UNSTABLE_HANDLER_CACHE.deleteCredential = (
        await import("./deleteCredential.handler")
      ).deleteCredentialHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.deleteCredential) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.deleteCredential({ ctx, input });
  }),
});
