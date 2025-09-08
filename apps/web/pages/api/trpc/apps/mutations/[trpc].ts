import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { appsMutationsRouter } from "@calcom/trpc/server/routers/viewer/apps/mutations/_router";

export default createNextApiHandler(appsMutationsRouter);
