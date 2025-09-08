import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { workflowsQueriesRouter } from "@calcom/trpc/server/routers/viewer/workflows/queries/_router";

export default createNextApiHandler(workflowsQueriesRouter);
