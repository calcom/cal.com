import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { dsyncQueriesRouter } from "@calcom/trpc/server/routers/viewer/dsync/queries/_router";

export default createNextApiHandler(dsyncQueriesRouter);
