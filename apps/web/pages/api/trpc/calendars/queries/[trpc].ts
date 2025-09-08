import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { calendarsQueriesRouter } from "@calcom/trpc/server/routers/viewer/calendars/queries/_router";

export default createNextApiHandler(calendarsQueriesRouter);
