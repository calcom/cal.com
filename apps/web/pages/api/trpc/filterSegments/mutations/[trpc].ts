import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { filterSegmentsRouter } from "@calcom/trpc/server/routers/viewer/filterSegments/mutations/_router";

export default createNextApiHandler(filterSegmentsRouter);
