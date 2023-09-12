import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { availabilityRouter } from "@calcom/trpc/server/routers/viewer/availability/_router";

export default createNextApiHandler(availabilityRouter);
