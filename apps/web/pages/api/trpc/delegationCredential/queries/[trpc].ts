import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { delegationCredentialQueriesRouter } from "@calcom/trpc/server/routers/viewer/delegationCredential/queries/_router";

export default createNextApiHandler(delegationCredentialQueriesRouter);
