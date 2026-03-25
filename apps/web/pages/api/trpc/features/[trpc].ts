import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { featureFlagRouter } from "@calcom/trpc/server/routers/features/_router";

export default createNextApiHandler(featureFlagRouter, true, "features");
