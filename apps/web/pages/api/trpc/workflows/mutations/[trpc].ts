import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { workflowsMutationsRouter } from "@calcom/trpc/server/routers/viewer/workflows/mutations/_router";

export default createNextApiHandler(workflowsMutationsRouter);
