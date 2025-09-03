import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { bulkEventFetchRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/bulkEventFetch/_router";

export default createNextApiHandler(bulkEventFetchRouter);
