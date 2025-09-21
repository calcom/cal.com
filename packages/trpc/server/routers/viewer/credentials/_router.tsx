import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCalIdDeleteCredentialInputSchema } from "./calid/deleteCredential.schema";
import { ZDeleteCredentialInputSchema } from "./deleteCredential.schema";

type CredentialsRouterHandlerCache = {
  deleteCredential?: typeof import("./deleteCredential.handler").deleteCredentialHandler;
  calid_deleteCredential?: typeof import("./calid/deleteCredential.handler").deleteCredentialHandler;
};

export const credentialsRouter = router({
  delete: authedProcedure.input(ZDeleteCredentialInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteCredentialHandler } = await import("./deleteCredential.handler");

    return deleteCredentialHandler({ ctx, input });
  }),
  calid_delete: authedProcedure.input(ZCalIdDeleteCredentialInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteCredentialHandler } = await import("./calid/deleteCredential.handler");

    return deleteCredentialHandler({ ctx, input });
  }),
});
