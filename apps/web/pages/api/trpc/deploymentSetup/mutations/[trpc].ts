import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { deploymentSetupRouter } from "@calcom/trpc/server/routers/viewer/deploymentSetup/mutations/_router";

export default createNextApiHandler(deploymentSetupRouter);
