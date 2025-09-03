import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { listRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/list/_router";

export default createNextApiHandler(listRouter);
