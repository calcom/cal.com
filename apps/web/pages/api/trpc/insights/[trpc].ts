import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { insightsRouter } from "@calcom/trpc/server/routers/viewer/insights/_router";

export default createNextApiHandler(insightsRouter);
