import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { deploymentSetupMutationsRouter } from "@calcom/trpc/server/routers/viewer/deploymentSetup/mutations/_router";

export default createNextApiHandler(deploymentSetupMutationsRouter);
