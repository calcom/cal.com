import { router, mergeRouters } from "../../../trpc";
import { calendarsMutationsRouter } from "./mutations/_router";
import { calendarsQueriesRouter } from "./queries/_router";

export const calendarsRouter = mergeRouters(
  router({
    queries: calendarsQueriesRouter,
    mutations: calendarsMutationsRouter,
  })
);
