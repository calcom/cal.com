import { availabilityRouter } from "@calcom/trpc/server/routers/viewer/availability/_router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(availabilityRouter);
