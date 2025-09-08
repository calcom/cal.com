import { router } from "../../../trpc";
import { pbacMutationsRouter } from "./mutations/_router";
import { pbacQueriesRouter } from "./queries/_router";

export const permissionsRouter = router({
  queries: pbacQueriesRouter,
  mutations: pbacMutationsRouter,
});
