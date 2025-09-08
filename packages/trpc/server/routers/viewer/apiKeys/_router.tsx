import { mergeRouters, router } from "../../../trpc";
import { apiKeysMutationsRouter } from "./mutations/_router";
import { apiKeysQueriesRouter } from "./queries/_router";

export const apiKeysRouter = mergeRouters(
  router({
    queries: apiKeysQueriesRouter,
    mutations: apiKeysMutationsRouter,
  })
);
