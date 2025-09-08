import { router } from "../../../trpc";
import { meMutationsRouter } from "./mutations/_router";
import { meQueriesRouter } from "./queries/_router";

export const meRouter = router({
  queries: meQueriesRouter,
  mutations: meMutationsRouter,
});
