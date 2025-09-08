import { router } from "../../../trpc";
import { webhookMutationsRouter } from "./mutations/_router";
import { webhookQueriesRouter } from "./queries/_router";

export const webhookRouter = router({
  queries: webhookQueriesRouter,
  mutations: webhookMutationsRouter,
});
