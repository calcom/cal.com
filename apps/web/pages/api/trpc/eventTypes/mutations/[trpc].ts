import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { eventTypesMutationsRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/mutations/_router";

export default createNextApiHandler(eventTypesMutationsRouter);
