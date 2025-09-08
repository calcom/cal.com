import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { deploymentSetupQueriesRouter } from "@calcom/trpc/server/routers/viewer/deploymentSetup/queries/_router";

export default createNextApiHandler(deploymentSetupQueriesRouter);
