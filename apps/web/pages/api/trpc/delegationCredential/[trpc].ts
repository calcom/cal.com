import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { delegationCredentialMutationsRouter } from "@calcom/trpc/server/routers/viewer/delegationCredential/mutations/_router";
import { delegationCredentialQueriesRouter } from "@calcom/trpc/server/routers/viewer/delegationCredential/queries/_router";
import { router } from "@calcom/trpc/server/trpc";

const delegationCredentialRouter = router({
  queries: delegationCredentialQueriesRouter,
  mutations: delegationCredentialMutationsRouter,
});

export default createNextApiHandler(delegationCredentialRouter);
