import { mergeRouters, router } from "../../../trpc";
import { deploymentSetupMutationsRouter } from "./mutations/_router";
import { deploymentSetupQueriesRouter } from "./queries/_router";

export const deploymentSetupRouter = mergeRouters(
  router({
    queries: deploymentSetupQueriesRouter,
    mutations: deploymentSetupMutationsRouter,
  })
);
