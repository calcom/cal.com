import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { delegationCredentialMutationsRouter } from "@calcom/trpc/server/routers/viewer/delegationCredential/mutations/_router";

export default createNextApiHandler(delegationCredentialMutationsRouter);
