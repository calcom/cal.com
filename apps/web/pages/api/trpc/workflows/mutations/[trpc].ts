import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { workflowsRouter } from "@calcom/trpc/server/routers/viewer/workflows/mutations/_router";

export default createNextApiHandler(workflowsRouter);
