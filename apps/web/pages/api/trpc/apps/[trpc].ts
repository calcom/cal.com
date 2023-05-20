import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { appsRouter } from "@calcom/trpc/server/routers/viewer/apps/_router";

export default createNextApiHandler(appsRouter);
