import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { travelSchedulesQueriesRouter } from "@calcom/trpc/server/routers/viewer/travelSchedules/queries/_router";

export default createNextApiHandler(travelSchedulesQueriesRouter);
