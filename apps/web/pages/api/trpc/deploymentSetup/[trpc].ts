import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { deploymentSetupMutationsRouter } from "@calcom/trpc/server/routers/viewer/deploymentSetup/mutations/_router";
import { deploymentSetupQueriesRouter } from "@calcom/trpc/server/routers/viewer/deploymentSetup/queries/_router";
import { router } from "@calcom/trpc/server/trpc";

const deploymentSetupRouter = router({
  queries: deploymentSetupQueriesRouter,
  mutations: deploymentSetupMutationsRouter,
});

export default createNextApiHandler(deploymentSetupRouter);
