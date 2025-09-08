import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { dsyncMutationsRouter } from "@calcom/trpc/server/routers/viewer/dsync/mutations/_router";

export default createNextApiHandler(dsyncMutationsRouter);
