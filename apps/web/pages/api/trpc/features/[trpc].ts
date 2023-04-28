import { featureFlagRouter } from "@calcom/features/flags/server/router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(featureFlagRouter);
