import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { delegationCredentialRouter } from "@calcom/trpc/server/routers/viewer/delegationCredential/queries/_router";

export default createNextApiHandler(delegationCredentialRouter);
