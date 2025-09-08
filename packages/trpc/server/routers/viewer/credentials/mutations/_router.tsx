import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZDeleteCredentialInputSchema } from "./deleteCredential.schema";

export const credentialsMutationsRouter = router({
  delete: authedProcedure.input(ZDeleteCredentialInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteCredentialHandler } = await import("./deleteCredential.handler");

    return deleteCredentialHandler({ ctx, input });
  }),
});
