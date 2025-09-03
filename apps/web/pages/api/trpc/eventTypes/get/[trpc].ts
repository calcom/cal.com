import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { getRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/get/_router";

export default createNextApiHandler(getRouter);
