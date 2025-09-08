import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { appsMutationsRouter } from "@calcom/trpc/server/routers/viewer/apps/mutations/_router";
import { appsQueriesRouter } from "@calcom/trpc/server/routers/viewer/apps/queries/_router";
import { router } from "@calcom/trpc/server/trpc";

const appsRouter = router({
  queries: appsQueriesRouter,
  mutations: appsMutationsRouter,
});

export default createNextApiHandler(appsRouter);
