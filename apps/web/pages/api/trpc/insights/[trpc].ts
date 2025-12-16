import { insightsRouter } from "@calcom/trpc/server/routers/viewer/insights/_router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(insightsRouter);
