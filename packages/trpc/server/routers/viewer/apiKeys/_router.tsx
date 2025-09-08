import { mergeRouters, router } from "../../../trpc";
import { apiKeysRouter } from "./mutations/_router";
import { apiKeysRouter } from "./queries/_router";

export const apiKeysRouter = mergeRouters(
  router({
    queries: apiKeysRouter,
    mutations: apiKeysRouter,
  })
);
