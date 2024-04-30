import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";

export default createNextApiHandler(eventTypesRouter);
