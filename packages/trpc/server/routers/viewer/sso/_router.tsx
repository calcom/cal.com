import { mergeRouters, router } from "../../../trpc";
import { ssoMutationsRouter } from "./mutations/_router";
import { ssoQueriesRouter } from "./queries/_router";

export const ssoRouter = mergeRouters(
  router({
    queries: ssoQueriesRouter,
    mutations: ssoMutationsRouter,
  })
);
