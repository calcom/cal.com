import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { loggedInViewerRouter } from "@calcom/trpc/server/routers/loggedInViewer/_router";

export default createNextApiHandler(loggedInViewerRouter);
