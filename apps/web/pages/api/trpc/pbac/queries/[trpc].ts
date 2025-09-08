import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { pbacQueriesRouter } from "@calcom/trpc/server/routers/viewer/pbac/queries/_router";

export default createNextApiHandler(pbacQueriesRouter);
