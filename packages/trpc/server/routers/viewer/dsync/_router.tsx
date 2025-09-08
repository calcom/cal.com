import { mergeRouters, router } from "../../../trpc";
import { dsyncMutationsRouter } from "./mutations/_router";
import { dsyncQueriesRouter } from "./queries/_router";
import { teamGroupMappingRouter } from "./teamGroupMapping/_router";

export const dsyncRouter = mergeRouters(
  router({
    queries: dsyncQueriesRouter,
    mutations: dsyncMutationsRouter,
    teamGroupMapping: teamGroupMappingRouter,
  })
);
