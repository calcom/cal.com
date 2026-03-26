import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { featureOptInRouter } from "@calcom/trpc/server/routers/viewer/featureOptIn/_router";

export default createNextApiHandler(featureOptInRouter);
