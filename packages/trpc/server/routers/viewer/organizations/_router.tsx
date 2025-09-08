import { mergeRouters, router } from "../../../trpc";
import { organizationsMutationsRouter } from "./mutations/_router";
import { organizationsQueriesRouter } from "./queries/_router";

export const viewerOrganizationsRouter = mergeRouters(
  router({
    queries: organizationsQueriesRouter,
    mutations: organizationsMutationsRouter,
  })
);
