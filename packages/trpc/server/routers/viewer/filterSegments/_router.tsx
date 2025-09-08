import { router } from "../../../trpc";
import { filterSegmentsMutationsRouter } from "./mutations/_router";
import { filterSegmentsQueriesRouter } from "./queries/_router";

export const filterSegmentsRouter = router({
  queries: filterSegmentsQueriesRouter,
  mutations: filterSegmentsMutationsRouter,
});
