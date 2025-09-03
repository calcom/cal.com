import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { bulkUpdateToDefaultLocationRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/bulkUpdateToDefaultLocation/_router";

export default createNextApiHandler(bulkUpdateToDefaultLocationRouter);
