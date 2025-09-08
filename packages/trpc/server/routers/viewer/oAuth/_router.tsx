import { mergeRouters, router } from "../../../trpc";
import { oAuthMutationsRouter } from "./mutations/_router";
import { oAuthQueriesRouter } from "./queries/_router";

export const oAuthRouter = mergeRouters(
  router({
    queries: oAuthQueriesRouter,
    mutations: oAuthMutationsRouter,
  })
);
