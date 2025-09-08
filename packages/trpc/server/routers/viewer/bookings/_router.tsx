import { router, mergeRouters } from "../../../trpc";
import { bookingsMutationsRouter } from "./mutations/_router";
import { bookingsQueriesRouter } from "./queries/_router";

export const bookingsRouter = mergeRouters(
  router({
    queries: bookingsQueriesRouter,
    mutations: bookingsMutationsRouter,
  })
);
