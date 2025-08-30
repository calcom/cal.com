import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { publicViewerRouter } from "@calcom/trpc/server/routers/publicViewer/_router";

export default createNextApiHandler(publicViewerRouter, true);
