import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { duplicateRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/duplicate/_router";

export default createNextApiHandler(duplicateRouter);
