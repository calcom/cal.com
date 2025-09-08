import { router, mergeRouters } from "../../../trpc";
import { eventTypesMutationsRouter } from "./mutations/_router";
import { eventTypesQueriesRouter } from "./queries/_router";

export const eventTypesRouter = mergeRouters(
  router({
    queries: eventTypesQueriesRouter,
    mutations: eventTypesMutationsRouter,
  })
);
