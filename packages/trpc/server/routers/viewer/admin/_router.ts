import { mergeRouters, router } from "../../../trpc";
import { adminMutationsRouter } from "./mutations/_router";
import { adminQueriesRouter } from "./queries/_router";

export const adminRouter = mergeRouters(
  router({
    queries: adminQueriesRouter,
    mutations: adminMutationsRouter,
  })
);
