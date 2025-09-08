import { router, mergeRouters } from "../../../trpc";
import { teamsMutationsRouter } from "./mutations/_router";
import { teamsQueriesRouter } from "./queries/_router";

export const viewerTeamsRouter = mergeRouters(
  router({
    queries: teamsQueriesRouter,
    mutations: teamsMutationsRouter,
  })
);
