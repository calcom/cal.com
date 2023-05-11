import { insightsRouter } from "@calcom/features/insights/server/trpc-router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(insightsRouter);
