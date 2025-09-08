import { router } from "../../../trpc";
import { delegationCredentialMutationsRouter } from "./mutations/_router";
import { delegationCredentialQueriesRouter } from "./queries/_router";

export const delegationCredentialRouter = router({
  queries: delegationCredentialQueriesRouter,
  mutations: delegationCredentialMutationsRouter,
});
