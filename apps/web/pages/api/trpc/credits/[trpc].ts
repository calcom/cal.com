import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { creditsMutationsRouter } from "@calcom/trpc/server/routers/viewer/credits/mutations/_router";
import { creditsQueriesRouter } from "@calcom/trpc/server/routers/viewer/credits/queries/_router";
import { router } from "@calcom/trpc/server/trpc";

const creditsRouter = router({
  queries: creditsQueriesRouter,
  mutations: creditsMutationsRouter,
});

export default createNextApiHandler(creditsRouter);
