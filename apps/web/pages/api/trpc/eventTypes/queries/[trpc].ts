import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { eventTypesQueriesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/queries/_router";

export default createNextApiHandler(eventTypesQueriesRouter);
