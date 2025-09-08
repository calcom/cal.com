import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { webhookQueriesRouter } from "@calcom/trpc/server/routers/viewer/webhook/queries/_router";

export default createNextApiHandler(webhookQueriesRouter);
