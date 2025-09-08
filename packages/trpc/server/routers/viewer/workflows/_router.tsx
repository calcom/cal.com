import { router, mergeRouters } from "../../../trpc";
import { workflowsMutationsRouter } from "./mutations/_router";
import { workflowsQueriesRouter } from "./queries/_router";

export const workflowsRouter = mergeRouters(
  router({
    queries: workflowsQueriesRouter,
    mutations: workflowsMutationsRouter,
  })
);
