import { router } from "../../../trpc";
import { appsMutationsRouter } from "./mutations/_router";
import { appsQueriesRouter } from "./queries/_router";

export const appsRouter = router({
  queries: appsQueriesRouter,
  mutations: appsMutationsRouter,
});
