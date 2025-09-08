import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { appsQueriesRouter } from "@calcom/trpc/server/routers/viewer/apps/queries/_router";

export default createNextApiHandler(appsQueriesRouter);
