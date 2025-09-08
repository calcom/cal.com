import { router } from "../../../trpc";
import { creditsMutationsRouter } from "./mutations/_router";
import { creditsQueriesRouter } from "./queries/_router";

export const creditsRouter = router({
  queries: creditsQueriesRouter,
  mutations: creditsMutationsRouter,
});
