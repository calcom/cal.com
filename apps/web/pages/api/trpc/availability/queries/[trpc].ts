import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { availabilityQueriesRouter } from "@calcom/trpc/server/routers/viewer/availability/queries/_router";

export default createNextApiHandler(availabilityQueriesRouter);
