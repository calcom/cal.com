import { mergeRouters, router } from "../../../trpc";
import { googleWorkspaceMutationsRouter } from "./mutations/_router";
import { googleWorkspaceQueriesRouter } from "./queries/_router";

export const googleWorkspaceRouter = mergeRouters(
  router({
    queries: googleWorkspaceQueriesRouter,
    mutations: googleWorkspaceMutationsRouter,
  })
);
