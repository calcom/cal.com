import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { availabilityRouter } from "@calcom/trpc/server/routers/viewer/availability/queries/_router";
import { router } from "@calcom/trpc/server/trpc";

export default createNextApiHandler(availabilityRouter);
