import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { getByViewerRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/getByViewer/_router";

export default createNextApiHandler(getByViewerRouter);
