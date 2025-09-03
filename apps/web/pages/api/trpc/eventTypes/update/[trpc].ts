import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { updateRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/update/_router";

export default createNextApiHandler(updateRouter);
