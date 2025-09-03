import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { createRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/create/_router";

export default createNextApiHandler(createRouter);
