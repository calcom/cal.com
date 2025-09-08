import { router } from "../../../trpc";
import { oooMutationsRouter } from "./mutations/_router";
import { oooQueriesRouter } from "./queries/_router";

export const oooRouter = router({
  queries: oooQueriesRouter,
  mutations: oooMutationsRouter,
});
