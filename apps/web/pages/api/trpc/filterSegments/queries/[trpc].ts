import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { filterSegmentsQueriesRouter } from "@calcom/trpc/server/routers/viewer/filterSegments/queries/_router";

export default createNextApiHandler(filterSegmentsQueriesRouter);
