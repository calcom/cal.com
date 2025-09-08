import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { slotsQueriesRouter } from "@calcom/trpc/server/routers/viewer/slots/queries/_router";

export default createNextApiHandler(slotsQueriesRouter);
