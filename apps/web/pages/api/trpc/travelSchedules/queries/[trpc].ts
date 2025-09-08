import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { travelSchedulesRouter } from "@calcom/trpc/server/routers/viewer/travelSchedules/queries/_router";

export default createNextApiHandler(travelSchedulesRouter);
